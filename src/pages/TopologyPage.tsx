import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Tag,
  Zap,
  Activity,
  Wifi,
  TrendingUp,
  Server,
  Router as RouterIcon,
  Monitor,
  ChevronRight,
  Home,
  Layers,
  Minimize2,
  Network,
} from "lucide-react";

import API_BASE from "../config/api";
import { useSocket } from "../hooks/useSocket";
import {
  TopologyNode,
  TopologyGroup,
  TopologyData,
  VisibleNode,
  VisibleLink,
  VisibleGroupNode,
  VisibleSubGroupNode,
  VisibleDeviceNode,
  VisibleInfraNode,
  computeOverviewLayout,
  computeExpandedGroupLayout,
  computeExpandedSubGroupLayout,
  filterByViewport,
} from "../utils/topologyGrouping";

// ---- Auth helper ----
function getAuthHeaders(): Record<string, string> {
  const userData = localStorage.getItem("user");
  if (!userData) return {};
  try {
    const parsed = JSON.parse(userData);
    const token = parsed?.token || parsed?.tokens?.accessToken;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // ignore
  }
  return {};
}

// ---- Breadcrumb type ----
interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'overview' | 'group' | 'subgroup';
}

// ---- Component ----
export function TopologyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Data
  const [topologyData, setTopologyData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', label: 'Overview', type: 'overview' },
  ]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedSubGroupId, setExpandedSubGroupId] = useState<string | null>(null);

  // Viewport
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 50, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Interaction
  const [hoveredItem, setHoveredItem] = useState<VisibleNode | null>(null);
  const [selectedItem, setSelectedItem] = useState<VisibleNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Display options
  const [showLabels, setShowLabels] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [time, setTime] = useState(0);

  // Animation state for transitions
  const [transitionProgress, setTransitionProgress] = useState(1); // 0→1 for fade-in
  const transitionRef = useRef<number | null>(null);

  // Layout compute cache
  const [visibleNodes, setVisibleNodes] = useState<VisibleNode[]>([]);
  const [visibleLinks, setVisibleLinks] = useState<VisibleLink[]>([]);

  // ─── WebSocket real-time updates ───
  const { liveDevices, connected: wsConnected } = useSocket();

  // ---- Fetch topology structure from API ----
  useEffect(() => {
    const fetchTopology = async () => {
      try {
        const response = await fetch(`${API_BASE}/monitoring/topology`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          setTopologyData({
            nodes: data.nodes || [],
            groups: data.groups || [],
            infrastructure: data.infrastructure || { routers: [], switches: [], gateway: null },
          });
        } else {
          setError(data.message || "Failed to fetch topology");
        }
      } catch (err) {
        console.error("Topology fetch error:", err);
        setError("Network error fetching topology");
      } finally {
        setLoading(false);
      }
    };

    fetchTopology();
    // Structural refresh: 60s with WS, 10s without
    const interval = setInterval(fetchTopology, wsConnected ? 60000 : 10000);
    return () => clearInterval(interval);
  }, [wsConnected]);

  // ---- Update node statuses from WebSocket live data ----
  useEffect(() => {
    if (!topologyData || !liveDevices || !Array.isArray(liveDevices) || liveDevices.length === 0) return;

    // Build IP → live metrics map
    const liveMap: Record<string, any> = {};
    liveDevices.forEach(d => { liveMap[d.ip] = d; });

    // Update node statuses without replacing the full topology structure
    const updatedNodes = topologyData.nodes.map(node => {
      const live = liveMap[node.ip];
      if (live) {
        const newStatus = (live.status !== 'Online' ? 'critical' :
          live.packetLoss > 50 ? 'critical' :
          live.latency > 100 ? 'warning' :
          live.packetLoss > 5 ? 'warning' : 'healthy') as 'critical' | 'warning' | 'healthy';
        return {
          ...node,
          status: newStatus,
          latency: live.latency || node.latency,
          packetLoss: live.packetLoss ?? node.packetLoss,
        };
      }
      return node;
    });

    setTopologyData(prev => prev ? {
      ...prev,
      nodes: updatedNodes,
    } : prev);
  }, [liveDevices]);

  // ---- Recompute layout when data or view changes ----
  useEffect(() => {
    if (!topologyData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    let layout: { nodes: VisibleNode[]; links: VisibleLink[] };

    if (expandedGroupId && expandedSubGroupId) {
      layout = computeExpandedSubGroupLayout(topologyData, expandedGroupId, expandedSubGroupId, W, H);
    } else if (expandedGroupId) {
      layout = computeExpandedGroupLayout(topologyData, expandedGroupId, W, H);
    } else {
      layout = computeOverviewLayout(topologyData, W, H);
    }

    setVisibleNodes(layout.nodes);
    setVisibleLinks(layout.links);
  }, [topologyData, expandedGroupId, expandedSubGroupId]);

  // ---- Animation timer ----
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      setTime(t => t + deltaTime);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // ---- Transition animation ----
  const triggerTransition = useCallback(() => {
    setTransitionProgress(0);
    if (transitionRef.current) cancelAnimationFrame(transitionRef.current);

    const start = performance.now();
    const duration = 400;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setTransitionProgress(eased);
      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(tick);
      }
    };

    transitionRef.current = requestAnimationFrame(tick);
  }, []);

  // ---- Navigation helpers ----
  const navigateToGroup = useCallback((groupId: string, label: string) => {
    setExpandedGroupId(groupId);
    setExpandedSubGroupId(null);
    setBreadcrumb(prev => [
      prev[0],
      { id: groupId, label, type: 'group' },
    ]);
    setSelectedItem(null);
    setHoveredItem(null);
    setOffset({ x: 50, y: 30 });
    setZoom(1);
    triggerTransition();
  }, [triggerTransition]);

  const navigateToSubGroup = useCallback((subGroupId: string, label: string) => {
    setExpandedSubGroupId(subGroupId);
    setBreadcrumb(prev => [
      ...prev.slice(0, 2),
      { id: subGroupId, label, type: 'subgroup' },
    ]);
    setSelectedItem(null);
    setHoveredItem(null);
    setOffset({ x: 50, y: 30 });
    setZoom(1);
    triggerTransition();
  }, [triggerTransition]);

  const navigateToBreadcrumb = useCallback((index: number) => {
    const target = breadcrumb[index];
    if (target.type === 'overview') {
      setExpandedGroupId(null);
      setExpandedSubGroupId(null);
      setBreadcrumb([breadcrumb[0]]);
    } else if (target.type === 'group') {
      setExpandedSubGroupId(null);
      setBreadcrumb(prev => prev.slice(0, index + 1));
    }
    setSelectedItem(null);
    setHoveredItem(null);
    setOffset({ x: 50, y: 30 });
    setZoom(1);
    triggerTransition();
  }, [breadcrumb, triggerTransition]);

  // ---- Canvas Rendering ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const W = rect.width;
    const H = rect.height;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const gridOffX = (offset.x % (gridSize * zoom)) / zoom;
    const gridOffY = (offset.y % (gridSize * zoom)) / zoom;
    for (let i = -gridSize; i < W / zoom + gridSize; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo((i + gridOffX) * zoom + (offset.x - gridOffX * zoom), 0);
      ctx.lineTo((i + gridOffX) * zoom + (offset.x - gridOffX * zoom), H);
      ctx.stroke();
    }
    for (let i = -gridSize; i < H / zoom + gridSize; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, (i + gridOffY) * zoom + (offset.y - gridOffY * zoom));
      ctx.lineTo(W, (i + gridOffY) * zoom + (offset.y - gridOffY * zoom));
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const alpha = transitionProgress;

    // Apply viewport culling
    const rendered = filterByViewport(visibleNodes, offset.x, offset.y, zoom, W, H);

    // Draw links
    visibleLinks.forEach(link => {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(link.sourceX, link.sourceY);
      ctx.lineTo(link.targetX, link.targetY);

      const statusColors: Record<string, string> = {
        healthy: 'rgba(100, 180, 255, 0.35)',
        warning: 'rgba(245, 158, 11, 0.45)',
        critical: 'rgba(239, 68, 68, 0.5)',
      };

      ctx.strokeStyle = statusColors[link.status] || statusColors.healthy;
      ctx.lineWidth = link.thickness;

      if (link.status === 'critical') {
        ctx.setLineDash([6, 4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Traffic animation on links
      if (showTraffic && link.status !== 'critical') {
        const numPackets = 2;
        for (let p = 0; p < numPackets; p++) {
          const progress = (time * 0.6 + p / numPackets) % 1;
          const px = link.sourceX + (link.targetX - link.sourceX) * progress;
          const py = link.sourceY + (link.targetY - link.sourceY) * progress;

          const gradient = ctx.createRadialGradient(px, py, 0, px, py, 5);
          gradient.addColorStop(0, 'rgba(96, 165, 250, 0.8)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Draw nodes
    rendered.forEach(vn => {
      ctx.globalAlpha = alpha;

      if (vn.kind === 'group') {
        drawGroupNode(ctx, vn, time, hoveredItem);
      } else if (vn.kind === 'subgroup') {
        drawSubGroupNode(ctx, vn, time, hoveredItem);
      } else if (vn.kind === 'infra') {
        drawInfraNode(ctx, vn, hoveredItem, showLabels);
      } else if (vn.kind === 'device') {
        drawDeviceNode(ctx, vn, hoveredItem, showLabels);
      }
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }, [offset, zoom, visibleNodes, visibleLinks, hoveredItem, showLabels, showTraffic, time, transitionProgress]);

  // ---- Draw helpers ----

  function drawGroupNode(ctx: CanvasRenderingContext2D, g: VisibleGroupNode, time: number, hovered: VisibleNode | null) {
    const isHovered = hovered?.kind === 'group' && (hovered as VisibleGroupNode).id === g.id;
    const r = g.radius;

    // Outer glow
    if (isHovered) {
      const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r * 2.5);
      glow.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
      glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(g.x, g.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pulse if critical
    if (g.statusSummary.critical > 0) {
      const pulse = Math.sin(time * 2.5) * 0.15 + 0.85;
      const pulseGlow = ctx.createRadialGradient(g.x, g.y, r, g.x, g.y, r + 15);
      pulseGlow.addColorStop(0, `rgba(239, 68, 68, ${0.3 * pulse})`);
      pulseGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = pulseGlow;
      ctx.beginPath();
      ctx.arc(g.x, g.y, r + 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hexagonal shape
    drawHexagon(ctx, g.x, g.y, r);
    const fillGrad = ctx.createLinearGradient(g.x - r, g.y - r, g.x + r, g.y + r);
    fillGrad.addColorStop(0, isHovered ? 'rgba(212, 175, 55, 0.2)' : 'rgba(30, 41, 59, 0.85)');
    fillGrad.addColorStop(1, isHovered ? 'rgba(212, 175, 55, 0.08)' : 'rgba(15, 23, 42, 0.9)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    ctx.strokeStyle = isHovered ? 'rgba(212, 175, 55, 0.9)' : 'rgba(100, 150, 220, 0.4)';
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    ctx.stroke();

    // Mini pie chart in center
    drawMiniPie(ctx, g.x, g.y - 6, 14, g.statusSummary);

    // Device count badge
    ctx.fillStyle = isHovered ? '#d4af37' : '#94a3b8';
    ctx.font = 'bold 13px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${g.deviceCount}`, g.x, g.y + 18);

    // Label below
    ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(200, 200, 200, 0.85)';
    ctx.font = '11px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(g.label, g.x, g.y + r + 20);
    ctx.shadowBlur = 0;

    // "Click to expand" hint on hover
    if (isHovered) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
      ctx.font = '9px Inter, system-ui';
      ctx.fillText('Click to expand', g.x, g.y + r + 34);
    }
  }

  function drawSubGroupNode(ctx: CanvasRenderingContext2D, sg: VisibleSubGroupNode, time: number, hovered: VisibleNode | null) {
    const isHovered = hovered?.kind === 'subgroup' && (hovered as VisibleSubGroupNode).id === sg.id;
    const r = sg.radius;

    if (isHovered) {
      const glow = ctx.createRadialGradient(sg.x, sg.y, 0, sg.x, sg.y, r * 2);
      glow.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
      glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sg.x, sg.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rounded rectangle
    const w = r * 2.2;
    const h = r * 1.8;
    const cr = 12;
    ctx.beginPath();
    ctx.moveTo(sg.x - w / 2 + cr, sg.y - h / 2);
    ctx.lineTo(sg.x + w / 2 - cr, sg.y - h / 2);
    ctx.quadraticCurveTo(sg.x + w / 2, sg.y - h / 2, sg.x + w / 2, sg.y - h / 2 + cr);
    ctx.lineTo(sg.x + w / 2, sg.y + h / 2 - cr);
    ctx.quadraticCurveTo(sg.x + w / 2, sg.y + h / 2, sg.x + w / 2 - cr, sg.y + h / 2);
    ctx.lineTo(sg.x - w / 2 + cr, sg.y + h / 2);
    ctx.quadraticCurveTo(sg.x - w / 2, sg.y + h / 2, sg.x - w / 2, sg.y + h / 2 - cr);
    ctx.lineTo(sg.x - w / 2, sg.y - h / 2 + cr);
    ctx.quadraticCurveTo(sg.x - w / 2, sg.y - h / 2, sg.x - w / 2 + cr, sg.y - h / 2);
    ctx.closePath();

    ctx.fillStyle = isHovered ? 'rgba(168, 85, 247, 0.15)' : 'rgba(30, 30, 50, 0.8)';
    ctx.fill();
    ctx.strokeStyle = isHovered ? 'rgba(168, 85, 247, 0.8)' : 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = isHovered ? 2 : 1.2;
    ctx.stroke();

    // Mini pie
    drawMiniPie(ctx, sg.x, sg.y - 8, 10, sg.statusSummary);

    // Count
    ctx.fillStyle = isHovered ? '#a855f7' : '#94a3b8';
    ctx.font = 'bold 12px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${sg.deviceCount}`, sg.x, sg.y + 14);

    // Label
    ctx.fillStyle = isHovered ? '#fff' : 'rgba(200,200,200,0.8)';
    ctx.font = '10px Inter, system-ui';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(sg.label, sg.x, sg.y + h / 2 + 18);
    ctx.shadowBlur = 0;

    if (isHovered) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.font = '9px Inter, system-ui';
      ctx.fillText('Click to expand', sg.x, sg.y + h / 2 + 30);
    }
  }

  function drawInfraNode(ctx: CanvasRenderingContext2D, vn: VisibleInfraNode, hovered: VisibleNode | null, showLabels: boolean) {
    const node = vn.node;
    const isHovered = hovered?.kind === 'infra' && (hovered as VisibleInfraNode).node.id === node.id;
    const size = node.type === 'router' ? 22 : 20;

    // Glow
    if (isHovered) {
      const glow = ctx.createRadialGradient(vn.x, vn.y, 0, vn.x, vn.y, size * 3);
      glow.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
      glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(vn.x, vn.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw the device shape
    drawNodeShape(ctx, vn.x, vn.y, node, size, isHovered);

    // Status dot
    const statusColor = node.status === 'healthy' ? '#22c55e' :
      node.status === 'warning' ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(vn.x + size - 4, vn.y - size + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    if (showLabels || isHovered) {
      ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(200, 200, 200, 0.8)';
      ctx.font = isHovered ? 'bold 13px Inter, system-ui' : '12px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(node.name, vn.x, vn.y + size + 20);
      ctx.shadowBlur = 0;
    }
  }

  function drawDeviceNode(ctx: CanvasRenderingContext2D, vn: VisibleDeviceNode, hovered: VisibleNode | null, showLabels: boolean) {
    const node = vn.node;
    const isHovered = hovered?.kind === 'device' && (hovered as VisibleDeviceNode).node.id === node.id;
    const size = 16;

    if (isHovered) {
      const glow = ctx.createRadialGradient(vn.x, vn.y, 0, vn.x, vn.y, size * 3);
      glow.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
      glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(vn.x, vn.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawNodeShape(ctx, vn.x, vn.y, node, size, isHovered);

    // Status dot
    const statusColor = node.status === 'healthy' ? '#22c55e' :
      node.status === 'warning' ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(vn.x + size - 4, vn.y - size + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (showLabels || isHovered) {
      ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(200, 200, 200, 0.8)';
      ctx.font = isHovered ? 'bold 12px Inter, system-ui' : '11px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(node.name, vn.x, vn.y + size + 18);
      // IP below name
      ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
      ctx.font = '9px Inter, system-ui';
      ctx.fillText(node.ip, vn.x, vn.y + size + 30);
      ctx.shadowBlur = 0;
    }
  }

  function drawNodeShape(ctx: CanvasRenderingContext2D, x: number, y: number, node: TopologyNode, size: number, highlighted: boolean) {
    const color = highlighted ? '#d4af37' :
      node.type === 'router' ? '#60a5fa' :
        node.type === 'switch' ? '#a855f7' : '#6b7280';

    ctx.save();
    ctx.translate(x, y);

    if (node.type === 'router') {
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.7, -size * 0.5, size * 1.4, size);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.5);
      ctx.lineTo(-size * 0.5, -size * 1.2);
      ctx.moveTo(size * 0.5, -size * 0.5);
      ctx.lineTo(size * 0.5, -size * 1.2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(-size * 0.5, -size * 1.2, 3, 0, Math.PI * 2);
      ctx.arc(size * 0.5, -size * 1.2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === 'switch') {
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) {
        const yPos = -size * 0.7 + i * (size * 0.45);
        ctx.fillRect(-size * 0.8, yPos, size * 1.6, size * 0.4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let j = 0; j < 6; j++) {
          ctx.fillRect(-size * 0.6 + j * (size * 0.2), yPos + size * 0.12, size * 0.12, size * 0.16);
        }
        ctx.fillStyle = color;
      }
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.7, -size * 0.6, size * 1.4, size);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(-size * 0.6, -size * 0.5, size * 1.2, size * 0.7);
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.35, size * 0.4, size * 0.7, size * 0.2);
      ctx.fillRect(-size * 0.2, size * 0.2, size * 0.4, size * 0.3);
    }

    ctx.restore();
  }

  function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawMiniPie(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, summary: { healthy: number; warning: number; critical: number }) {
    const total = summary.healthy + summary.warning + summary.critical;
    if (total === 0) return;

    const segments = [
      { value: summary.healthy, color: '#22c55e' },
      { value: summary.warning, color: '#f59e0b' },
      { value: summary.critical, color: '#ef4444' },
    ];

    let startAngle = -Math.PI / 2;
    segments.forEach(seg => {
      if (seg.value === 0) return;
      const sliceAngle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Center hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
  }

  // ---- Hit detection ----
  const findItemAt = useCallback((canvasX: number, canvasY: number): VisibleNode | null => {
    // Check in reverse order (top-most drawn last)
    for (let i = visibleNodes.length - 1; i >= 0; i--) {
      const vn = visibleNodes[i];

      if (vn.kind === 'group') {
        const dist = Math.sqrt((vn.x - canvasX) ** 2 + (vn.y - canvasY) ** 2);
        if (dist <= vn.radius + 5) return vn;
      } else if (vn.kind === 'subgroup') {
        const w = vn.radius * 2.2 / 2;
        const h = vn.radius * 1.8 / 2;
        if (canvasX >= vn.x - w && canvasX <= vn.x + w &&
            canvasY >= vn.y - h && canvasY <= vn.y + h) return vn;
      } else if (vn.kind === 'infra') {
        const size = vn.node.type === 'router' ? 22 : 20;
        const dist = Math.sqrt((vn.x - canvasX) ** 2 + (vn.y - canvasY) ** 2);
        if (dist <= size + 5) return vn;
      } else if (vn.kind === 'device') {
        const size = 16;
        const dist = Math.sqrt((vn.x - canvasX) ** 2 + (vn.y - canvasY) ** 2);
        if (dist <= size + 5) return vn;
      }
    }
    return null;
  }, [visibleNodes]);

  // ---- Mouse handlers ----
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: mouseX, y: mouseY });

    const worldX = (mouseX - offset.x) / zoom;
    const worldY = (mouseY - offset.y) / zoom;

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const item = findItemAt(worldX, worldY);
    setHoveredItem(item);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const worldX = ((e.clientX - rect.left) - offset.x) / zoom;
    const worldY = ((e.clientY - rect.top) - offset.y) / zoom;

    const item = findItemAt(worldX, worldY);

    if (item) {
      if (item.kind === 'group') {
        // Navigate into group
        navigateToGroup(item.id, item.label);
      } else if (item.kind === 'subgroup') {
        // Navigate into sub-group
        navigateToSubGroup(item.id, item.label);
      } else {
        // Select device/infra
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(null);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 50, y: 30 });
  };

  const collapseAll = () => {
    setExpandedGroupId(null);
    setExpandedSubGroupId(null);
    setBreadcrumb([{ id: 'root', label: 'Overview', type: 'overview' }]);
    setSelectedItem(null);
    setHoveredItem(null);
    setOffset({ x: 50, y: 30 });
    setZoom(1);
    triggerTransition();
  };

  // ---- Compute summary stats ----
  const stats = useMemo(() => {
    if (!topologyData) return null;
    const totalDevices = topologyData.nodes.length;
    const healthy = topologyData.nodes.filter(n => n.status === 'healthy').length;
    const warning = topologyData.nodes.filter(n => n.status === 'warning').length;
    const critical = topologyData.nodes.filter(n => n.status === 'critical').length;
    const groups = topologyData.groups.length;
    return { totalDevices, healthy, warning, critical, groups };
  }, [topologyData]);

  // ---- Hovere detail node ----
  const hoveredDetail = useMemo(() => {
    const item = hoveredItem || selectedItem;
    if (!item) return null;
    if (item.kind === 'device') return (item as VisibleDeviceNode).node;
    if (item.kind === 'infra') return (item as VisibleInfraNode).node;
    return null;
  }, [hoveredItem, selectedItem]);

  const hoveredGroupDetail = useMemo(() => {
    const item = hoveredItem;
    if (!item) return null;
    if (item.kind === 'group') return item as VisibleGroupNode;
    if (item.kind === 'subgroup') return item as VisibleSubGroupNode;
    return null;
  }, [hoveredItem]);

  // ---- Loading/Error states ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[#d4af37]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-t-[#d4af37] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <Network className="absolute inset-0 m-auto w-6 h-6 text-[#d4af37]" />
          </div>
          <span className="text-gray-400 text-sm">Loading topology...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#0a0a0a]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Breadcrumb Navigation */}
      <div className="absolute top-6 left-6 flex items-center gap-1 z-40">
        {breadcrumb.map((item, i) => (
          <div key={item.id} className="flex items-center">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-600 mx-1" />}
            <button
              onClick={() => navigateToBreadcrumb(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                i === breadcrumb.length - 1
                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                  : 'bg-[#1a1a1a]/80 text-gray-400 hover:text-[#d4af37] hover:bg-[#1a1a1a] border border-[#2a2a2a]'
              } backdrop-blur-sm`}
            >
              {i === 0 && <Home className="w-3 h-3" />}
              {item.label}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/90 backdrop-blur-sm border border-[#2a2a2a] rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl z-40">
        <button
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-[#d4af37]"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => setZoom(prev => Math.max(0.3, prev * 0.8))}
          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-[#d4af37]"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={resetView}
          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-[#d4af37]"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-[#2a2a2a]" />

        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-2 rounded-lg transition-colors ${showLabels ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-[#d4af37]'}`}
          title="Toggle Labels"
        >
          <Tag className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`p-2 rounded-lg transition-colors ${showTraffic ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-[#d4af37]'}`}
          title="Toggle Traffic Animation"
        >
          <Zap className="w-4 h-4" />
        </button>

        {expandedGroupId && (
          <>
            <div className="w-px h-6 bg-[#2a2a2a]" />
            <button
              onClick={collapseAll}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-[#d4af37]"
              title="Collapse All — Return to Overview"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Group/SubGroup Hover Card */}
      {hoveredGroupDetail && (
        <div
          className="absolute bg-[#1a1a1a]/95 backdrop-blur-md border border-[#d4af37]/40 rounded-xl p-4 shadow-2xl pointer-events-none z-50 min-w-[200px]"
          style={{
            left: `${mousePos.x + 20}px`,
            top: `${mousePos.y - 60}px`,
            transform: mousePos.x > 600 ? 'translateX(-100%) translateX(-40px)' : 'none'
          }}
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2a2a2a]">
            <div className="p-1.5 rounded-lg bg-blue-500/20">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{hoveredGroupDetail.label}</h3>
              <p className="text-xs text-gray-400">{hoveredGroupDetail.deviceCount} devices</p>
            </div>
          </div>

          {/* Health breakdown */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-400">Healthy</span>
              </div>
              <span className="text-green-400 font-medium">{hoveredGroupDetail.statusSummary.healthy}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-400">Warning</span>
              </div>
              <span className="text-amber-400 font-medium">{hoveredGroupDetail.statusSummary.warning}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-400">Critical</span>
              </div>
              <span className="text-red-400 font-medium">{hoveredGroupDetail.statusSummary.critical}</span>
            </div>
          </div>

          {/* Health bar */}
          <div className="w-full h-2 rounded-full bg-[#2a2a2a] overflow-hidden flex">
            {hoveredGroupDetail.statusSummary.healthy > 0 && (
              <div className="h-full bg-green-500" style={{ width: `${(hoveredGroupDetail.statusSummary.healthy / hoveredGroupDetail.deviceCount) * 100}%` }} />
            )}
            {hoveredGroupDetail.statusSummary.warning > 0 && (
              <div className="h-full bg-amber-500" style={{ width: `${(hoveredGroupDetail.statusSummary.warning / hoveredGroupDetail.deviceCount) * 100}%` }} />
            )}
            {hoveredGroupDetail.statusSummary.critical > 0 && (
              <div className="h-full bg-red-500" style={{ width: `${(hoveredGroupDetail.statusSummary.critical / hoveredGroupDetail.deviceCount) * 100}%` }} />
            )}
          </div>

          {/* Type breakdown for groups */}
          {hoveredGroupDetail.kind === 'group' && (hoveredGroupDetail as VisibleGroupNode).typeBreakdown && (
            <div className="mt-3 pt-2 border-t border-[#2a2a2a]">
              <div className="text-xs text-gray-500 mb-1.5">Device Types</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries((hoveredGroupDetail as VisibleGroupNode).typeBreakdown).map(([type, count]) => (
                  <span key={type} className="text-xs bg-[#2a2a2a] text-gray-300 px-2 py-0.5 rounded">
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Device Hover/Selection Card */}
      {hoveredDetail && (
        <div
          className="absolute bg-[#1a1a1a]/95 backdrop-blur-md border border-[#d4af37]/40 rounded-xl p-4 shadow-2xl pointer-events-none z-50"
          style={{
            left: `${mousePos.x + 20}px`,
            top: `${mousePos.y - 80}px`,
            transform: mousePos.x > 600 ? 'translateX(-100%) translateX(-40px)' : 'none'
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3 pb-3 border-b border-[#2a2a2a]">
            <div className={`p-2 rounded-lg ${hoveredDetail.type === 'router' ? 'bg-blue-500/20' :
                hoveredDetail.type === 'switch' ? 'bg-purple-500/20' : 'bg-gray-500/20'
              }`}>
              {hoveredDetail.type === 'router' ? <RouterIcon className="w-5 h-5 text-blue-400" /> :
                hoveredDetail.type === 'switch' ? <Server className="w-5 h-5 text-purple-400" /> :
                  <Monitor className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-0.5">{hoveredDetail.name}</h3>
              <p className="text-xs text-gray-400 font-mono">{hoveredDetail.ip}</p>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${hoveredDetail.status === 'healthy' ? 'bg-green-500/20 text-green-400' :
                hoveredDetail.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
              }`}>
              {hoveredDetail.status}
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Activity className="w-3.5 h-3.5" />
                <span>Latency</span>
              </div>
              <span className={`font-medium ${hoveredDetail.latency > 30 ? 'text-red-400' :
                  hoveredDetail.latency > 20 ? 'text-amber-400' : 'text-green-400'
                }`}>{hoveredDetail.latency}ms</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Packet Loss</span>
              </div>
              <span className={`font-medium ${hoveredDetail.packetLoss > 1 ? 'text-red-400' :
                  hoveredDetail.packetLoss > 0.5 ? 'text-amber-400' : 'text-green-400'
                }`}>{hoveredDetail.packetLoss}%</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>Bandwidth</span>
              </div>
              <span className="font-medium text-blue-400">{hoveredDetail.bandwidth} Mbps</span>
            </div>
          </div>

          {/* Uptime */}
          <div className="pt-2 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Uptime</span>
              <span className="font-medium text-[#d4af37]">{hoveredDetail.uptime}</span>
            </div>
          </div>

          {/* Connections */}
          {hoveredDetail.connections.length > 0 && topologyData && (
            <div className="pt-2 border-t border-[#2a2a2a] mt-2">
              <div className="text-xs text-gray-400 mb-1.5">Connected to {hoveredDetail.connections.length} device(s)</div>
              <div className="flex flex-wrap gap-1">
                {hoveredDetail.connections.slice(0, 4).map(connId => {
                  const conn = topologyData.nodes.find(n => n.id === connId);
                  return conn ? (
                    <span key={connId} className="text-xs bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded">
                      {conn.name}
                    </span>
                  ) : null;
                })}
                {hoveredDetail.connections.length > 4 && (
                  <span className="text-xs text-gray-500 px-2 py-0.5">
                    +{hoveredDetail.connections.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Summary Stats */}
      {stats && (
        <div className="absolute top-20 right-6 bg-[#1a1a1a]/90 backdrop-blur-sm border border-[#2a2a2a] rounded-xl p-4 shadow-2xl z-30">
          <div className="text-xs font-medium text-gray-400 mb-3">Network Summary</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6 text-xs">
              <span className="text-gray-400">Total Devices</span>
              <span className="font-medium text-white">{stats.totalDevices}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-xs">
              <span className="text-gray-400">Groups</span>
              <span className="font-medium text-blue-400">{stats.groups}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-400">Healthy</span>
              </div>
              <span className="font-medium text-green-400">{stats.healthy}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-400">Warning</span>
              </div>
              <span className="font-medium text-amber-400">{stats.warning}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-400">Critical</span>
              </div>
              <span className="font-medium text-red-400">{stats.critical}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legends */}
      <div className="absolute bottom-6 left-6 bg-[#1a1a1a]/90 backdrop-blur-sm border border-[#2a2a2a] rounded-xl p-4 shadow-2xl z-30">
        <div className="text-xs font-medium text-gray-400 mb-3">
          {expandedGroupId ? 'Device Types' : 'Node Types'}
        </div>
        <div className="space-y-2">
          {!expandedGroupId && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <svg viewBox="0 0 20 20" className="w-4 h-4">
                    <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="text-xs text-gray-300">Subnet Group</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#60a5fa]" />
            <span className="text-xs text-gray-300">Router</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#a855f7]" />
            <span className="text-xs text-gray-300">Switch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#6b7280]" />
            <span className="text-xs text-gray-300">Device</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 bg-[#1a1a1a]/90 backdrop-blur-sm border border-[#2a2a2a] rounded-xl p-4 shadow-2xl z-30">
        <div className="text-xs font-medium text-gray-400 mb-3">Network Health</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-300">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-300">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-300">Critical</span>
          </div>
        </div>
      </div>

      {/* View level indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#2a2a2a] rounded-full px-4 py-2 text-xs text-gray-400 z-30 flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
        <span>
          {!expandedGroupId ? `Overview — ${topologyData?.groups.length || 0} groups` :
           expandedSubGroupId ? 'Device View' :
           'Group View'}
        </span>
        <span className="text-gray-600 ml-1">|</span>
        <span className="text-gray-500">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}