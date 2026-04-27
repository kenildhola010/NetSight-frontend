import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Router as RouterIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  Wifi,
  Server,
  Network as NetworkIcon,
  ArrowUp,
  ArrowDown,
  Monitor,
  Loader2,
  RefreshCw,
  Radio
} from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import API_BASE from "../config/api";
import { useSocket } from "../hooks/useSocket";

function getAuthHeaders(): Record<string, string> {
  try {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      const token = parsed?.token || parsed?.tokens?.accessToken;
      if (token) {
        return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      }
    }
  } catch { }
  return { "Content-Type": "application/json" };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  if (!seconds) return "N/A";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  avgLatency: number;
  uptimePercent: number;
  activeAlerts: number;
  criticalAlerts: number;
  totalTrafficIn: number;
  totalTrafficOut: number;
  avgCpu: number;
  avgMemory: number;
}

interface MonitoredDevice {
  _id: string;
  name: string;
  ip: string;
  type: string;
  vendor: string;
  status: string;
  latency: number;
  packetLoss: number;
  cpuUsage: number;
  memoryUsage: number;
  trafficIn: number;
  trafficOut: number;
  uptime: number;
  lastSeen: string;
  isGateway: boolean;
}

interface AlertItem {
  _id: string;
  device: string;
  deviceIp: string;
  message: string;
  severity: string;
  time: string;
  acknowledged: boolean;
}

export function Dashboard() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [devices, setDevices] = useState<MonitoredDevice[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [latencyTrend, setLatencyTrend] = useState<any[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<any[]>([]);
  const [deviceDistribution, setDeviceDistribution] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // ─── WebSocket real-time data ───
  const { liveDevices, liveStats, connected: wsConnected, lastUpdate: wsLastUpdate } = useSocket();

  // Merge live data into state when received
  useEffect(() => {
    if (liveStats) {
      setStats(prev => ({ ...prev, ...liveStats } as DashboardStats));
      setLastUpdate(wsLastUpdate);
      setLoading(false);
    }
  }, [liveStats, wsLastUpdate]);

  useEffect(() => {
    if (liveDevices.length > 0) {
      setDevices(liveDevices as any);
      setLoading(false);
    }
  }, [liveDevices]);

  // ─── HTTP fetch for historical data + alerts (not real-time) ───
  const fetchHistorical = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const results = await Promise.allSettled([
        fetch(`${API_BASE}/monitoring/dashboard`, { headers }),
        fetch(`${API_BASE}/monitoring/devices`, { headers }),
        fetch(`${API_BASE}/monitoring/alerts`, { headers }),
        fetch(`${API_BASE}/monitoring/latency-trend`, { headers }),
        fetch(`${API_BASE}/monitoring/performance-trend`, { headers }),
        fetch(`${API_BASE}/monitoring/device-distribution`, { headers }),
        fetch(`${API_BASE}/monitoring/traffic`, { headers }),
      ]);

      const jsonResults = await Promise.allSettled(
        results.map(r => r.status === 'fulfilled' ? r.value.json() : Promise.reject())
      );

      const getData = (index: number) =>
        jsonResults[index]?.status === 'fulfilled' ? (jsonResults[index] as PromiseFulfilledResult<any>).value : null;

      // Only set stats/devices from HTTP if WebSocket isn't providing them
      if (!wsConnected) {
        const statsData = getData(0);
        const devicesData = getData(1);
        if (statsData?.success) setStats(statsData.stats);
        if (devicesData?.success) setDevices(devicesData.devices);
      }

      const alertsData = getData(2);
      const latencyData = getData(3);
      const perfData = getData(4);
      const distData = getData(5);
      const trafficD = getData(6);

      if (alertsData?.success) setAlerts(alertsData.alerts);
      if (latencyData?.success) setLatencyTrend(latencyData.trend);
      if (perfData?.success) setPerformanceTrend(perfData.trend);
      if (distData?.success) setDeviceDistribution(distData.distribution);
      if (trafficD?.success) setTrafficData(trafficD.traffic);
      setLastUpdate(new Date());
    } catch (err: any) {
      if (!err?.message?.includes('Failed to fetch')) {
        console.error("Dashboard fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [wsConnected]);

  // Initial fetch + refresh historical data every 60s (alerts, charts)
  useEffect(() => {
    fetchHistorical();
    const interval = setInterval(fetchHistorical, 60000);
    return () => clearInterval(interval);
  }, [fetchHistorical]);

  // Draw network topology based on real devices — clean grouped hierarchical layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !devices || !Array.isArray(devices) || devices.length === 0) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ---- Classify devices ----
    const gateway = devices.find(d => d.isGateway);
    const others = devices.filter(d => !d.isGateway);

    const useClusters = devices.length >= 10;

    // Group non-gateway devices by type
    const groups: Record<string, { devices: MonitoredDevice[]; online: number; offline: number }> = {};
    if (useClusters) {
      others.forEach(d => {
        const type = d.type || 'Unknown';
        if (!groups[type]) groups[type] = { devices: [], online: 0, offline: 0 };
        groups[type].devices.push(d);
        if (d.status === 'Online') groups[type].online++;
        else groups[type].offline++;
      });
    }

    const groupKeys = Object.keys(groups);

    // ---- Layout tiers ----
    const tierGateway = H * 0.2;
    const tierInfra = H * 0.5;      // for switches/routers among "others"
    const tierDevices = H * 0.82;    // for grouped device clusters

    // Separate infrastructure-type groups (Router, Switch) from end-device groups
    const infraTypes = ['Router', 'Switch'];
    const infraGroups = useClusters ? groupKeys.filter(k => infraTypes.includes(k)) : [];
    const deviceGroups = useClusters ? groupKeys.filter(k => !infraTypes.includes(k)) : [];

    // Flatten infrastructure devices into individual visible nodes (max ~8 shown)
    const infraDevices: { d: MonitoredDevice; x: number; y: number }[] = [];

    if (!useClusters) {
      const allInfra = others.filter(d => infraTypes.includes(d.type || ''));
      const allEndDevs = others.filter(d => !infraTypes.includes(d.type || ''));

      allInfra.forEach((d, i) => {
        const x = allInfra.length === 1 ? W * 0.5 : W * (0.15 + 0.7 * i / (allInfra.length - 1));
        infraDevices.push({ d, x, y: tierInfra });
      });

      allEndDevs.forEach((d, i) => {
        const x = allEndDevs.length === 1 ? W * 0.5 : W * (0.15 + 0.7 * i / (allEndDevs.length - 1));
        infraDevices.push({ d, x, y: tierDevices });
      });
    } else {
      const allInfra = infraGroups.flatMap(k => groups[k]?.devices || []);
      const maxInfraShow = Math.min(allInfra.length, 8);
      for (let i = 0; i < maxInfraShow; i++) {
        const x = W * (0.15 + 0.7 * i / Math.max(1, maxInfraShow - 1));
        infraDevices.push({ d: allInfra[i], x, y: tierInfra });
      }
    }

    const hasInfraTier = infraDevices.some(inf => inf.y === tierInfra);

    // Device group cluster positions
    interface ClusterInfo {
      key: string; x: number; y: number; total: number; online: number; offline: number;
    }
    const clusters: ClusterInfo[] = [];

    if (useClusters) {
      const totalClusters = deviceGroups.length + (infraGroups.length > 0 && infraGroups.flatMap(k => groups[k].devices).length > 8 ? 1 : 0);
      const clusterKeys = deviceGroups.length > 0 ? deviceGroups : groupKeys;

      clusterKeys.forEach((key, i) => {
        const count = clusterKeys.length;
        const x = count === 1 ? W * 0.5 : W * (0.15 + 0.7 * i / Math.max(1, count - 1));
        const g = groups[key];
        clusters.push({
          key,
          x,
          y: hasInfraTier ? tierDevices : tierInfra,
          total: g?.devices?.length || 0,
          online: g?.online || 0,
          offline: g?.offline || 0,
        });
      });
    }

    // ---- Helper: draw curved link ----
    function drawCurvedLink(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const cpY = y1 + (y2 - y1) * 0.5;
      ctx.bezierCurveTo(x1, cpY, x2, cpY, x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // ---- Helper: draw glowing circle node ----
    function drawGlowNode(x: number, y: number, radius: number, color: string, glowColor: string) {
      // Glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.8);
      glow.addColorStop(0, glowColor);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Fill
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color + '30';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ---- Draw links ----
    if (gateway && !useClusters) {
      const gwX = W * 0.5;
      const infraOnly = infraDevices.filter(inf => inf.y === tierInfra);
      const endOnly = infraDevices.filter(inf => inf.y === tierDevices);

      if (infraOnly.length > 0) {
        infraOnly.forEach(inf => {
          const linkColor = inf.d.status === 'Online'
            ? 'rgba(74, 222, 128, 0.25)'
            : 'rgba(248, 113, 113, 0.25)';
          drawCurvedLink(gwX, tierGateway + 16, inf.x, inf.y - 14, linkColor, 1.5);
        });

        endOnly.forEach(endDev => {
          const nearest = infraOnly.reduce((best, inf) =>
            Math.abs(inf.x - endDev.x) < Math.abs(best.x - endDev.x) ? inf : best
            , infraOnly[0]);
          const linkColor = endDev.d.status === 'Online'
            ? 'rgba(96, 165, 250, 0.2)'
            : 'rgba(248, 113, 113, 0.2)';
          drawCurvedLink(nearest.x, nearest.y + 14, endDev.x, endDev.y - 14, linkColor, 1.2);
        });
      } else {
        endOnly.forEach(endDev => {
          const linkColor = endDev.d.status === 'Online'
            ? 'rgba(74, 222, 128, 0.25)'
            : 'rgba(248, 113, 113, 0.25)';
          drawCurvedLink(gwX, tierGateway + 16, endDev.x, endDev.y - 14, linkColor, 1.5);
        });
      }
    } else if (gateway && useClusters) {
      const gwX = W * 0.5;
      infraDevices.forEach(inf => {
        const linkColor = inf.d.status === 'Online'
          ? 'rgba(74, 222, 128, 0.25)'
          : 'rgba(248, 113, 113, 0.25)';
        drawCurvedLink(gwX, tierGateway + 16, inf.x, inf.y - 14, linkColor, 1.5);
      });

      clusters.forEach(cl => {
        if (hasInfraTier) {
          const nearest = infraDevices.reduce((best, inf) =>
            Math.abs(inf.x - cl.x) < Math.abs(best.x - cl.x) ? inf : best
            , infraDevices[0]);
          if (nearest) {
            const linkColor = cl.offline > cl.online
              ? 'rgba(248, 113, 113, 0.2)'
              : 'rgba(96, 165, 250, 0.2)';
            drawCurvedLink(nearest.x, nearest.y + 14, cl.x, cl.y - 22, linkColor, 1.2);
          }
        } else {
          const linkColor = cl.offline > cl.online
            ? 'rgba(248, 113, 113, 0.2)'
            : 'rgba(96, 165, 250, 0.2)';
          drawCurvedLink(gwX, tierGateway + 16, cl.x, cl.y - 22, linkColor, 1.5);
        }
      });
    }

    // ---- Draw Gateway node ----
    if (gateway) {
      const gwX = W * 0.5;
      const isOnline = gateway.status === 'Online';
      const color = isOnline ? '#10b981' : '#ef4444';

      drawGlowNode(gwX, tierGateway, 16, color, isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)');

      // Icon
      ctx.fillStyle = color;
      ctx.font = 'bold 14px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', gwX, tierGateway);

      // Label
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 10px Inter, system-ui';
      ctx.textBaseline = 'top';
      const gwName = gateway.name || (gateway as any).hostname || gateway.ip || 'Gateway';
      ctx.fillText(gwName, gwX, tierGateway + 20);
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px Inter, system-ui';
      ctx.fillText('Gateway', gwX, tierGateway + 32);
    }

    // ---- Draw Infra tier & End Devices modes ----
    infraDevices.forEach(inf => {
      const isOnline = inf.d.status === 'Online';
      const isRouter = inf.d.type === 'Router';
      const isSwitch = inf.d.type === 'Switch';
      const color = isOnline ? (isRouter ? '#60a5fa' : isSwitch ? '#a855f7' : '#22c55e') : '#ef4444';

      drawGlowNode(inf.x, inf.y, 12, color, (isOnline ? color : '#ef4444') + '18');

      // Icon
      ctx.fillStyle = color;
      ctx.font = '11px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const iconStr = isRouter ? '⚡' : isSwitch ? '⚙' : '💻';
      ctx.fillText(iconStr, inf.x, inf.y);

      // Status dot
      ctx.beginPath();
      ctx.arc(inf.x + 10, inf.y - 10, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isOnline ? '#22c55e' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#d1d5db';
      ctx.font = '9px Inter, system-ui';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      const rawName = inf.d.name || (inf.d as any).hostname || inf.d.ip || 'Unknown';
      const displayName = rawName.length > 14 ? rawName.slice(0, 12) + '…' : rawName;
      ctx.fillText(displayName, inf.x, inf.y + 16);
    });

    // ---- Draw Device Cluster nodes ----
    clusters.forEach(cl => {
      const healthRatio = cl.total > 0 ? cl.online / cl.total : 0;
      const clusterColor = healthRatio >= 0.8 ? '#22c55e' :
        healthRatio >= 0.5 ? '#f59e0b' : '#ef4444';

      // Rounded rect cluster shape
      const rw = Math.max(60, Math.min(90, 40 + cl.total * 0.3));
      const rh = 36;
      const cr = 10;

      // Glow
      const glow = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, rw);
      glow.addColorStop(0, clusterColor + '15');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, rw, 0, Math.PI * 2);
      ctx.fill();

      // Background
      ctx.beginPath();
      ctx.moveTo(cl.x - rw / 2 + cr, cl.y - rh / 2);
      ctx.lineTo(cl.x + rw / 2 - cr, cl.y - rh / 2);
      ctx.quadraticCurveTo(cl.x + rw / 2, cl.y - rh / 2, cl.x + rw / 2, cl.y - rh / 2 + cr);
      ctx.lineTo(cl.x + rw / 2, cl.y + rh / 2 - cr);
      ctx.quadraticCurveTo(cl.x + rw / 2, cl.y + rh / 2, cl.x + rw / 2 - cr, cl.y + rh / 2);
      ctx.lineTo(cl.x - rw / 2 + cr, cl.y + rh / 2);
      ctx.quadraticCurveTo(cl.x - rw / 2, cl.y + rh / 2, cl.x - rw / 2, cl.y + rh / 2 - cr);
      ctx.lineTo(cl.x - rw / 2, cl.y - rh / 2 + cr);
      ctx.quadraticCurveTo(cl.x - rw / 2, cl.y - rh / 2, cl.x - rw / 2 + cr, cl.y - rh / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(26, 26, 26, 0.9)';
      ctx.fill();
      ctx.strokeStyle = clusterColor + '60';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Count badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cl.total), cl.x, cl.y - 3);

      // Mini health bar inside cluster
      const barW = rw - 16;
      const barH = 3;
      const barX = cl.x - barW / 2;
      const barY = cl.y + 10;
      ctx.fillStyle = 'rgba(50,50,50,0.8)';
      ctx.fillRect(barX, barY, barW, barH);
      if (cl.online > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, barY, barW * (cl.online / cl.total), barH);
      }

      // Type label below
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(cl.key, cl.x, cl.y + rh / 2 + 6);

      // Online/offline counts
      ctx.font = '8px Inter, system-ui';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${cl.online} on · ${cl.offline} off`, cl.x, cl.y + rh / 2 + 18);
    });

    // ---- Tier labels on left edge ----
    ctx.save();
    ctx.fillStyle = 'rgba(100,100,100,0.35)';
    ctx.font = '8px Inter, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (gateway) ctx.fillText('GATEWAY', 8, tierGateway);
    if (hasInfraTier) ctx.fillText('INFRA', 8, tierInfra);
    ctx.fillText('DEVICES', 8, hasInfraTier ? tierDevices : tierInfra);
    ctx.restore();

  }, [devices]);

  if (loading && !stats) {
    return (
      <div className="p-6 bg-[#0a0a0a] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0a0a0a]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-white mb-1">Network Overview</h1>
          <p className="text-gray-400">Real-time monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {wsConnected ? (
              <>
                <Radio className="w-3 h-3 text-green-400 animate-pulse" />
                <span className="text-green-400">Live</span> — {lastUpdate.toLocaleTimeString()}
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                Polling — {lastUpdate.toLocaleTimeString()}
              </>
            )}
          </div>
          <button
            onClick={fetchHistorical}
            className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-400 hover:text-[#d4af37] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Devices"
          value={String(stats?.totalDevices || 0)}
          change={`${stats?.onlineDevices || 0} online, ${stats?.offlineDevices || 0} offline`}
          trend="up"
          icon={<RouterIcon className="w-5 h-5 text-[#d4af37]" />}
        />
        <StatCard
          title="Network Uptime"
          value={`${stats?.uptimePercent || 0}%`}
          change={`${stats?.onlineDevices || 0}/${stats?.totalDevices || 0} devices up`}
          trend={stats?.uptimePercent === 100 ? "up" : "neutral"}
          icon={<Wifi className="w-5 h-5 text-green-500" />}
        />
        <StatCard
          title="Avg Latency"
          value={`${stats?.avgLatency || 0}ms`}
          change={`CPU: ${stats?.avgCpu || 0}% | RAM: ${stats?.avgMemory || 0}%`}
          trend={stats?.avgLatency && stats.avgLatency < 50 ? "down" : "neutral"}
          icon={<Activity className="w-5 h-5 text-[#d4af37]" />}
        />
        <StatCard
          title="Active Alerts"
          value={String(stats?.activeAlerts || 0)}
          change={`${stats?.criticalAlerts || 0} critical`}
          trend="neutral"
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Network Map */}
        <div className="lg:col-span-2 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white mb-1">Network Topology</h3>
              <p className="text-sm text-gray-400">
                {devices.length} devices · {devices.filter(d => d.status === 'Online').length} online
              </p>
            </div>
            <button
              onClick={() => navigate('/app/topology')}
              className="text-sm text-[#d4af37] hover:text-[#f59e0b] font-medium"
            >
              View Details →
            </button>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-6 h-64">
            <canvas ref={canvasRef} width={800} height={220} className="w-full h-full" />
          </div>

          {/* Device Health Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-center">
              <div className="text-2xl font-semibold text-green-500 mb-1">{stats?.onlineDevices || 0}</div>
              <div className="text-xs text-gray-400">Online</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-center">
              <div className="text-2xl font-semibold text-red-500 mb-1">{stats?.offlineDevices || 0}</div>
              <div className="text-xs text-gray-400">Offline</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-center">
              <div className="text-2xl font-semibold text-[#d4af37] mb-1">{stats?.avgLatency || 0}ms</div>
              <div className="text-xs text-gray-400">Avg Latency</div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white">Recent Alerts</h3>
            <button
              onClick={() => navigate('/app/alerts')}
              className="text-sm text-[#d4af37] hover:text-[#f59e0b] font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No active alerts</p>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg hover:border-[#d4af37]/30 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white mb-0.5">{alert.device}</div>
                      <div className="text-xs text-gray-400 mb-1">{alert.message}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {alert.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Latency Chart */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <div className="mb-4">
            <h3 className="text-white mb-1">Latency Trend</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-white">{stats?.avgLatency || 0}ms</span>
              <span className="inline-flex items-center gap-1 text-sm text-green-500">
                <Activity className="w-4 h-4" />
                avg
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={latencyTrend}>
              <defs>
                <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} unit="ms" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#4ade80' }}
                formatter={(val: number) => [`${val}ms`, 'Latency']}
              />
              <Area type="monotone" dataKey="value" stroke="#4ade80" fill="url(#latencyGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Uptime/Performance Chart */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <div className="mb-4">
            <h3 className="text-white mb-1">Uptime</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-white">{stats?.uptimePercent || 0}%</span>
              <span className="inline-flex items-center gap-1 text-sm text-green-500">
                <TrendingUp className="w-4 h-4" />
                availability
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={performanceTrend}>
              <defs>
                <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
                formatter={(val: number) => [`${val}%`, 'Uptime']}
              />
              <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="url(#uptimeGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Per-Device Health */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <h3 className="text-white mb-4">Device Health</h3>
          <div className="space-y-3">
            {devices.map((device, i) => (
              <div key={device.ip || device._id || i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${device.status === 'Online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-400 truncate max-w-[120px]">{device.name}</span>
                  </div>
                  <span className="text-sm text-white font-medium">{device.latency}ms</span>
                </div>
                <div className="w-full bg-[#0a0a0a] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${device.status === 'Offline' ? 'bg-red-500' :
                      device.latency < 30 ? 'bg-green-500' :
                        device.latency < 80 ? 'bg-[#d4af37]' : 'bg-red-500'
                      }`}
                    style={{ width: `${Math.min(100, device.status === 'Online' ? Math.max(10, 100 - device.latency) : 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Distribution */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <h3 className="text-white mb-4">Device Types</h3>
          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={deviceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }}
                  itemStyle={{ color: '#d4af37' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {deviceDistribution.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <h3 className="text-white mb-4">Quick Metrics</h3>
          <div className="space-y-4">
            <MetricRow
              icon={<ArrowDown className="w-5 h-5 text-[#60a5fa]" />}
              title="Traffic In"
              value={formatBytes(stats?.totalTrafficIn || 0)}
              bgColor="bg-[#60a5fa]/10"
            />
            <MetricRow
              icon={<ArrowUp className="w-5 h-5 text-[#d4af37]" />}
              title="Traffic Out"
              value={formatBytes(stats?.totalTrafficOut || 0)}
              bgColor="bg-[#d4af37]/10"
            />
            <MetricRow
              icon={<Monitor className="w-5 h-5 text-[#4ade80]" />}
              title="Avg CPU"
              value={`${stats?.avgCpu || 0}%`}
              bgColor="bg-[#4ade80]/10"
            />
            <MetricRow
              icon={<Server className="w-5 h-5 text-[#a855f7]" />}
              title="Avg Memory"
              value={`${stats?.avgMemory || 0}%`}
              bgColor="bg-[#a855f7]/10"
            />
          </div>
        </div>
      </div>

      {/* Traffic Chart - Full Width */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white mb-1">Traffic Overview</h3>
            <p className="text-sm text-gray-400">Hourly bandwidth usage</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-white">{formatBytes((stats?.totalTrafficIn || 0) + (stats?.totalTrafficOut || 0))}</div>
            <div className="text-sm text-gray-400">Current total</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} unit=" MB" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#d4af37' }}
              formatter={(val: number) => [`${val} MB`, 'Traffic']}
              cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }}
            />
            <Bar dataKey="value" fill="#d4af37" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon }: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-semibold text-white mb-2">{value}</div>
      <div className={`text-sm flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-green-500' : 'text-gray-400'
        }`}>
        {trend === 'up' && <TrendingUp className="w-4 h-4" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4" />}
        {change}
      </div>
    </div>
  );
}

function MetricRow({ icon, title, value, bgColor }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg border border-[#2a2a2a] p-3 flex items-center gap-3`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-400 mb-0.5">{title}</div>
        <div className="text-lg font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}