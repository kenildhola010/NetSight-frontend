// topologyGrouping.ts — Utility for hierarchical topology layout computation
// No React dependency — pure layout math

export interface TopologyNode {
  id: string;
  name: string;
  type: 'router' | 'switch' | 'device';
  ip: string;
  mac?: string;
  deviceType?: string;
  status: 'healthy' | 'warning' | 'critical';
  connections: string[];
  latency: number;
  packetLoss: number;
  bandwidth: number;
  uptime: string;
  vendor?: string;
  // Layout positions (computed client-side)
  x: number;
  y: number;
}

export interface StatusSummary {
  healthy: number;
  warning: number;
  critical: number;
}

export interface SubGroup {
  id: string;
  label: string;
  deviceIds: string[];
  deviceCount: number;
  statusSummary: StatusSummary;
}

export interface TopologyGroup {
  id: string;
  label: string;
  subnet: string;
  deviceCount: number;
  statusSummary: StatusSummary;
  typeBreakdown: Record<string, number>;
  subGroups: SubGroup[] | null;
  deviceIds: string[];
}

export interface Infrastructure {
  routers: string[];
  switches: string[];
  gateway: string | null;
}

export interface TopologyData {
  nodes: TopologyNode[];
  groups: TopologyGroup[];
  infrastructure: Infrastructure;
}

// ---- Visible node types used by the renderer ----

export interface VisibleGroupNode {
  kind: 'group';
  id: string;
  label: string;
  deviceCount: number;
  statusSummary: StatusSummary;
  typeBreakdown: Record<string, number>;
  hasSubGroups: boolean;
  x: number;
  y: number;
  radius: number;
}

export interface VisibleSubGroupNode {
  kind: 'subgroup';
  id: string;
  parentGroupId: string;
  label: string;
  deviceCount: number;
  statusSummary: StatusSummary;
  x: number;
  y: number;
  radius: number;
}

export interface VisibleDeviceNode {
  kind: 'device';
  node: TopologyNode;
  x: number;
  y: number;
}

export interface VisibleInfraNode {
  kind: 'infra';
  node: TopologyNode;
  x: number;
  y: number;
}

export type VisibleNode = VisibleGroupNode | VisibleSubGroupNode | VisibleDeviceNode | VisibleInfraNode;

export interface VisibleLink {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  thickness: number;
  status: 'healthy' | 'warning' | 'critical';
}

// ---- Layout computation ----

/**
 * Compute the overview layout: infrastructure nodes + collapsed group nodes.
 */
export function computeOverviewLayout(
  data: TopologyData,
  canvasWidth: number,
  canvasHeight: number
): { nodes: VisibleNode[]; links: VisibleLink[] } {
  const result: VisibleNode[] = [];
  const linksResult: VisibleLink[] = [];

  const nodeMap = new Map<string, TopologyNode>();
  data.nodes.forEach(n => nodeMap.set(n.id, n));

  // Layout params — compact to keep nodes within viewport
  const routerY = 80;
  const switchY = 200;
  const groupY = 340;
  const groupSpacingY = 160;
  const deviceStartY = 340;
  const deviceCellH = 100;

  // Position routers (Tier 1)
  const routerNodes = data.infrastructure.routers.map(id => nodeMap.get(id)!).filter(Boolean);
  routerNodes.forEach((r, i) => {
    const x = canvasWidth / (routerNodes.length + 1) * (i + 1);
    r.x = x;
    r.y = routerY;
    result.push({ kind: 'infra', node: r, x, y: routerY });
  });

  // Position switches (Tier 2)
  const switchNodes = data.infrastructure.switches.map(id => nodeMap.get(id)!).filter(Boolean);
  switchNodes.forEach((s, i) => {
    const x = canvasWidth / (switchNodes.length + 1) * (i + 1);
    s.x = x;
    s.y = switchY;
    result.push({ kind: 'infra', node: s, x, y: switchY });
  });

  // Links: Routers → Switches
  if (routerNodes.length > 0 && switchNodes.length > 0) {
    const gateway = routerNodes.find(r => {
      const gw = data.infrastructure.gateway;
      return gw && r.id === gw;
    }) || routerNodes[0];

    switchNodes.forEach(s => {
      linksResult.push({
        sourceId: gateway.id,
        targetId: s.id,
        sourceX: gateway.x,
        sourceY: gateway.y,
        targetX: s.x,
        targetY: s.y,
        thickness: 3,
        status: s.status === 'critical' ? 'critical' : s.status === 'warning' ? 'warning' : 'healthy',
      });
    });
  }

  // Determine which infra tier connects down to groups/devices
  const infraConnectors = switchNodes.length > 0 ? switchNodes : routerNodes;

  // Position group nodes or individual devices (Tier 3)
  const groups = data.groups;

  if (groups && groups.length > 0) {
    const groupsPerRow = Math.max(1, Math.min(groups.length, Math.floor(canvasWidth / 220)));
    const groupCellWidth = canvasWidth / (groupsPerRow + 1);

    groups.forEach((g, i) => {
      const row = Math.floor(i / groupsPerRow);
      const col = i % groupsPerRow;
      const x = groupCellWidth * (col + 1);
      const y = groupY + row * groupSpacingY;
      const radius = 30 + Math.min(g.deviceCount, 100) * 0.5;

      result.push({
        kind: 'group',
        id: g.id,
        label: g.label,
        deviceCount: g.deviceCount,
        statusSummary: g.statusSummary,
        typeBreakdown: g.typeBreakdown,
        hasSubGroups: g.subGroups !== null && g.subGroups.length > 0,
        x,
        y,
        radius,
      });
    });

    // Links: infrastructure → group nodes (subnet-aware)
    groups.forEach((g, gi) => {
      const groupVis = result.find(v => v.kind === 'group' && (v as VisibleGroupNode).id === g.id) as VisibleGroupNode;
      if (!groupVis) return;

      // Try to find a router/switch on the same subnet as this group
      const groupSubnet = g.subnet || g.label.replace('Subnet ', '').replace('.x', '');

      // Look for infrastructure on the same subnet
      let connector = [...switchNodes, ...routerNodes].find(n => {
        const ip = n.ip || '';
        const parts = ip.split('.');
        const nodeSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
        return nodeSubnet === groupSubnet;
      });

      // Fallback: round-robin across all infra
      if (!connector) {
        const connectorIdx = gi % Math.max(1, infraConnectors.length);
        connector = infraConnectors[connectorIdx];
      }
      if (!connector) return;

      const worstStatus: 'healthy' | 'warning' | 'critical' =
        g.statusSummary.critical > 0 ? 'critical' :
        g.statusSummary.warning > 0 ? 'warning' : 'healthy';

      linksResult.push({
        sourceId: connector.id,
        targetId: g.id,
        sourceX: connector.x,
        sourceY: connector.y,
        targetX: groupVis.x,
        targetY: groupVis.y,
        thickness: Math.max(1.5, Math.min(g.deviceCount / 5, 6)),
        status: worstStatus,
      });
    });
  } else {
    // If no groups, render end-devices directly in a compact grid
    const endDevices = data.nodes.filter(n => n.type === 'device');
    const maxPerRow = Math.max(1, Math.floor(canvasWidth / 140));

    endDevices.forEach((d, i) => {
      const row = Math.floor(i / maxPerRow);
      const itemsInRow = Math.min(maxPerRow, endDevices.length - row * maxPerRow);
      const col = i % maxPerRow;

      const spacing = canvasWidth / (itemsInRow + 1);
      const x = spacing * (col + 1);
      const y = deviceStartY + row * deviceCellH;

      d.x = x;
      d.y = y;

      result.push({ kind: 'device', node: d, x, y });
    });

    // Links: infrastructure → individual devices
    endDevices.forEach((d, i) => {
      const connectorIdx = i % Math.max(1, infraConnectors.length);
      const connector = infraConnectors[connectorIdx];
      if (!connector) return;

      linksResult.push({
        sourceId: connector.id,
        targetId: d.id,
        sourceX: connector.x,
        sourceY: connector.y,
        targetX: d.x,
        targetY: d.y,
        thickness: 1.5,
        status: d.status,
      });
    });
  }

  return { nodes: result, links: linksResult };
}

/**
 * Compute layout for an expanded group — shows sub-groups or devices.
 */
export function computeExpandedGroupLayout(
  data: TopologyData,
  groupId: string,
  canvasWidth: number,
  _canvasHeight: number
): { nodes: VisibleNode[]; links: VisibleLink[] } {
  const result: VisibleNode[] = [];
  const linksResult: VisibleLink[] = [];

  const nodeMap = new Map<string, TopologyNode>();
  data.nodes.forEach(n => nodeMap.set(n.id, n));

  const group = data.groups.find(g => g.id === groupId);
  if (!group) return { nodes: result, links: linksResult };

  // If group has sub-groups, show those as clickable cluster nodes
  if (group.subGroups && group.subGroups.length > 0) {
    const sgPerRow = Math.max(1, Math.min(group.subGroups.length, Math.floor(canvasWidth / 220)));
    const cellWidth = canvasWidth / (sgPerRow + 1);
    const startY = 200;

    group.subGroups.forEach((sg, i) => {
      const row = Math.floor(i / sgPerRow);
      const col = i % sgPerRow;
      const x = cellWidth * (col + 1);
      const y = startY + row * 200;
      const radius = 25 + Math.min(sg.deviceCount, 30) * 0.8;

      result.push({
        kind: 'subgroup',
        id: sg.id,
        parentGroupId: groupId,
        label: sg.label,
        deviceCount: sg.deviceCount,
        statusSummary: sg.statusSummary,
        x,
        y,
        radius,
      });
    });
  } else {
    // Show individual devices in a grid
    layoutDevicesInGrid(group.deviceIds, nodeMap, canvasWidth, result);
  }

  return { nodes: result, links: linksResult };
}

/**
 * Compute layout for an expanded sub-group — shows individual devices.
 */
export function computeExpandedSubGroupLayout(
  data: TopologyData,
  groupId: string,
  subGroupId: string,
  canvasWidth: number,
  _canvasHeight: number
): { nodes: VisibleNode[]; links: VisibleLink[] } {
  const result: VisibleNode[] = [];
  const linksResult: VisibleLink[] = [];

  const nodeMap = new Map<string, TopologyNode>();
  data.nodes.forEach(n => nodeMap.set(n.id, n));

  const group = data.groups.find(g => g.id === groupId);
  if (!group || !group.subGroups) return { nodes: result, links: linksResult };

  const subGroup = group.subGroups.find(sg => sg.id === subGroupId);
  if (!subGroup) return { nodes: result, links: linksResult };

  layoutDevicesInGrid(subGroup.deviceIds, nodeMap, canvasWidth, result);

  return { nodes: result, links: linksResult };
}

function layoutDevicesInGrid(
  deviceIds: string[],
  nodeMap: Map<string, TopologyNode>,
  canvasWidth: number,
  result: VisibleNode[]
) {
  const maxPerRow = Math.max(1, Math.floor(canvasWidth / 120));
  const cellW = canvasWidth / (maxPerRow + 1);
  const cellH = 110;
  const startY = 180;

  deviceIds.forEach((id, i) => {
    const node = nodeMap.get(id);
    if (!node) return;

    const col = i % maxPerRow;
    const row = Math.floor(i / maxPerRow);
    const x = cellW * (col + 1);
    const y = startY + row * cellH;

    node.x = x;
    node.y = y;

    result.push({ kind: 'device', node, x, y });
  });
}

/**
 * Filter visible nodes by viewport bounds for performance (lazy rendering).
 */
export function filterByViewport(
  nodes: VisibleNode[],
  offsetX: number,
  offsetY: number,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 100
): VisibleNode[] {
  const left = -offsetX / zoom - padding;
  const top = -offsetY / zoom - padding;
  const right = (canvasWidth - offsetX) / zoom + padding;
  const bottom = (canvasHeight - offsetY) / zoom + padding;

  return nodes.filter(n => {
    const x = n.x;
    const y = n.y;
    return x >= left && x <= right && y >= top && y <= bottom;
  });
}
