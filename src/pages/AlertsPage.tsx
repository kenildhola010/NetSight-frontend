import { useState, useEffect, useCallback, useRef } from "react";
import { Search, CheckCircle, AlertTriangle, XCircle, Clock, Bell, RefreshCw, Wifi, Square, CheckSquare, X } from "lucide-react";
import { io, Socket } from "socket.io-client";
import API_BASE from "../config/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Alert {
  _id: string;
  device: string;
  deviceIp: string;
  message: string;
  severity: "critical" | "warning" | "info";
  status: "NEW" | "ACKNOWLEDGED" | "RESOLVED" | "CLOSED";
  acknowledged: boolean;
  duplicate_count: number;
  acknowledgedBy?: string;
  metric?: string;
  metric_value?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SOCKET_URL = "http://localhost:5000";

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const token = parsed?.token || parsed?.tokens?.accessToken;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch { }
  return {};
}

function getUserRole(): string {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.user?.role?.toLowerCase() || "";
  } catch { return ""; }
}

async function apiFetch(path: string, options: RequestInit = {}, signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) },
    ...options,
    signal
  });
  return res.json();
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hideResolved, setHideResolved] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);
  const [newAlertFlash, setNewAlertFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);
  const userRole = getUserRole();
  const isViewer = userRole === "viewer";

  // ─── Fetch alerts ────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async (silent = false) => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "15", page: String(page) });
      if (severityFilter !== "all") params.set("severity", severityFilter);

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      } else if (hideResolved) {
        // If "Hide Resolved" is active and no specific status is selected, only show active ones
        params.set("status", "NEW,ACKNOWLEDGED");
      }

      const data = await apiFetch(`/monitoring/alerts?${params}`, {}, controller.signal);

      if (data.success) {
        // Client-side search filter (fast, no extra round-trip)
        const filtered = searchQuery
          ? data.alerts.filter(
            (a: Alert) =>
              a.device?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.message?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          : data.alerts;
        setAlerts(filtered);
        setTotal(data.total);
        setTotalPages(data.pages);
      } else {
        setError("Failed to load alerts. Please refresh.");
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return; // Ignore intentional cancellations
      setError("Cannot connect to server. Ensure the backend is running.");
    } finally {
      // Only clear loading if this was the last request started
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [page, severityFilter, statusFilter, searchQuery, hideResolved]);

  // ─── Initial fetch + filter changes ─────────────────────────────────────
  // Fetch data when filters or page changes
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    const triggerFetch = () => fetchAlerts();

    // Use debounce only for text search to avoid lag
    if (searchQuery) {
      searchDebounce.current = setTimeout(triggerFetch, 350);
    } else {
      triggerFetch();
    }

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [fetchAlerts, hideResolved]);

  // Reset to page 1 on filter/search change (to avoid "page out of range" issues)
  // Use a ref to track filters to avoid circular dependency if needed, 
  // but status/severity state changes are fine since fetchAlerts wraps them.
  useEffect(() => {
    setPage(1);
  }, [severityFilter, statusFilter, searchQuery, hideResolved]);

  // ─── WebSocket real-time listener ────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setLiveConnected(true));
    socket.on("disconnect", () => setLiveConnected(false));

    socket.on("alert_updated", (event: { action: string; data: any }) => {
      const { action, data } = event;

      if (action === "CREATED") {
        // Flash the bell & inject new alert at top (if it matches current filters)
        setNewAlertFlash(true);
        setTimeout(() => setNewAlertFlash(false), 2000);
        setAlerts(prev => {
          // Avoid adding if filters don't match
          const matchesSeverity = severityFilter === "all" || data.severity === severityFilter;
          const matchesStatus = statusFilter === "all" || data.status === statusFilter;
          const matchesHideResolved = !hideResolved || (data.status !== "RESOLVED" && data.status !== "CLOSED");

          if (!matchesSeverity || !matchesStatus || !matchesHideResolved) return prev;
          return [formatSocketAlert(data), ...prev.slice(0, 14)];
        });
        setTotal(prev => prev + 1);
      } else if (action === "STATUS_CHANGED" || action === "DUPLICATE_UPDATED") {
        setAlerts(prev => {
          // If status changed to something that should be hidden, remove it
          const isNowHidden = hideResolved && (data.status === "RESOLVED" || data.status === "CLOSED");
          if (action === "STATUS_CHANGED" && isNowHidden) {
            return prev.filter(a => a._id !== data._id);
          }

          // Otherwise, update the existing alert
          return prev.map(a => (a._id === data._id ? { ...a, ...formatSocketAlert(data) } : a));
        });
        // Also update the detail drawer if open
        setSelectedAlert(prev => (prev?._id === data._id ? { ...prev, ...formatSocketAlert(data) } : prev));
      }
    });

    return () => { socket.disconnect(); };
  }, [severityFilter, statusFilter, hideResolved]);

  function formatSocketAlert(raw: any): Alert {
    return {
      _id: raw._id,
      device: raw.deviceName || raw.device,
      deviceIp: raw.deviceIp,
      message: raw.message,
      severity: raw.severity,
      status: raw.status || (raw.acknowledged ? "ACKNOWLEDGED" : "NEW"),
      acknowledged: raw.acknowledged,
      duplicate_count: raw.duplicate_count || 0,
      acknowledgedBy: raw.acknowledgedBy?.name || raw.acknowledgedBy,
      metric: raw.metric,
      metric_value: raw.metric_value,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleAcknowledge = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(id);
    try {
      const data = await apiFetch(`/monitoring/alerts/${id}/acknowledge`, { method: "PUT" });
      if (data.success) {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: "ACKNOWLEDGED", acknowledged: true } : a));
        setSelectedAlert(prev => prev?._id === id ? { ...prev, status: "ACKNOWLEDGED", acknowledged: true } : prev);
      }
    } catch { }
    setActionLoading(null);
  };

  const handleResolve = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(id);
    try {
      const data = await apiFetch(`/monitoring/alerts/${id}/resolve`, { method: "PUT" });
      if (data.success) {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: "RESOLVED", acknowledged: true } : a));
        setSelectedAlert(prev => prev?._id === id ? { ...prev, status: "RESOLVED", acknowledged: true } : prev);
      }
    } catch { }
    setActionLoading(null);
  };

  const handleAcknowledgeAll = async () => {
    const newAlerts = alerts.filter(a => a.status === "NEW");
    if (newAlerts.length === 0) return;
    await Promise.all(newAlerts.map(a => handleAcknowledge(a._id)));
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    const visibleIds = alerts.map(a => a._id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));

    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      visibleIds.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      visibleIds.forEach(id => next.add(id));
      setSelectedIds(next);
    }
  };

  const handleBulkAction = async (status: "ACKNOWLEDGED" | "RESOLVED") => {
    if (selectedIds.size === 0) return;
    setActionLoading("bulk");
    try {
      const data = await apiFetch(`/monitoring/alerts/bulk`, {
        method: "PUT",
        body: JSON.stringify({ ids: Array.from(selectedIds), status })
      });
      if (data.success) {
        // Optimization: Status update is handled via Socket.io usually, 
        // but we can also manually update local state for immediate feedback
        setAlerts(prev => prev.map(a =>
          selectedIds.has(a._id)
            ? { ...a, status, acknowledged: true }
            : a
        ));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
      }
    } catch { }
    setActionLoading(null);
  };

  // ─── Stats (from current loaded data + total) ─────────────────────────────
  const stats = {
    total: alerts.filter(a => a.status === "NEW" || a.status === "ACKNOWLEDGED").length,
    critical: alerts.filter(a => a.severity === "critical" && a.status !== "RESOLVED" && a.status !== "CLOSED").length,
    warning: alerts.filter(a => a.severity === "warning" && a.status !== "RESOLVED" && a.status !== "CLOSED").length,
    info: alerts.filter(a => a.severity === "info" && a.status !== "RESOLVED" && a.status !== "CLOSED").length,
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleString("en-GB", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }).replace(",", "");
    } catch { return isoStr; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-white mb-1">Alerts &amp; Notifications</h1>
          <p className="text-gray-400">Monitor and manage network alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${liveConnected
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-gray-500/30 bg-gray-500/10 text-gray-400"
            }`}>
            <Wifi className="w-3 h-3" />
            {liveConnected ? "Live" : "Connecting..."}
          </div>
          <button
            onClick={() => fetchAlerts()}
            className="p-2 border border-[#2a2a2a] text-gray-400 rounded-lg hover:bg-[#1a1a1a] hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Active" value={total} icon={<Bell className={`w-5 h-5 text-[#d4af37] ${newAlertFlash ? "animate-bounce" : ""}`} />} color="gold" />
        <StatCard label="Critical" value={stats.critical} icon={<XCircle className="w-5 h-5 text-red-500" />} color="red" />
        <StatCard label="Warning" value={stats.warning} icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} color="amber" />
        <StatCard label="Info" value={stats.info} icon={<CheckCircle className="w-5 h-5 text-blue-500" />} color="blue" />
      </div>

      {/* Toolbar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {!isViewer && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectionMode}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold border ${isSelectionMode
                  ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                  : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white"
                  }`}
              >
                {isSelectionMode ? "Cancel Select" : "Select"}
              </button>
              {isSelectionMode ? (
                <>
                  <button
                    onClick={() => handleBulkAction("ACKNOWLEDGED")}
                    disabled={selectedIds.size === 0 || actionLoading === "bulk"}
                    className="px-4 py-2 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors text-sm font-semibold disabled:opacity-40"
                  >
                    Acknowledge {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                  </button>
                  <button
                    onClick={() => handleBulkAction("RESOLVED")}
                    disabled={selectedIds.size === 0 || actionLoading === "bulk"}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-40"
                  >
                    Resolve {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleAcknowledgeAll}
                  className="px-4 py-2 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors text-sm font-semibold"
                >
                  Acknowledge All
                </button>
              )}
            </div>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search alerts by device or message..."
              className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
            >
              <option value="all">All Status</option>
              <option value="NEW">New</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 rounded-lg ml-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-tight">Hide Resolved</span>
              <button
                onClick={() => setHideResolved(!hideResolved)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${hideResolved ? 'bg-[#d4af37]' : 'bg-[#2a2a2a]'
                  }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${hideResolved ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  style={{ transform: hideResolved ? 'translateX(1.15rem)' : 'translateX(0.25rem)' }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
              <tr>
                {isSelectionMode && (
                  <th className="w-10 py-3 px-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-500 hover:text-[#d4af37] transition-colors"
                    >
                      {alerts.length > 0 && alerts.every(a => selectedIds.has(a._id))
                        ? <CheckSquare className="w-4 h-4 text-[#d4af37]" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                )}
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Device</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Message</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#2a2a2a] animate-pulse">
                    <td className="py-3 px-4"><div className="h-5 w-20 bg-white/5 rounded-full" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-28 bg-white/5 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-64 bg-white/5 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-32 bg-white/5 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-5 w-24 bg-white/5 rounded-full" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-white/5 rounded" /></td>
                  </tr>
                ))
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-500">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <div className="font-medium">No alerts match your filters</div>
                    <div className="text-sm mt-1">Try adjusting severity or status filters</div>
                  </td>
                </tr>
              ) : (
                alerts.map(alert => (
                  <tr
                    key={alert._id}
                    onClick={() => isSelectionMode ? handleSelectOne(alert._id, { stopPropagation: () => { } } as any) : setSelectedAlert(alert)}
                    className={`border-b border-[#2a2a2a] hover:bg-white/[0.03] cursor-pointer transition-colors ${selectedIds.has(alert._id) ? "bg-[#d4af37]/5" : ""
                      }`}
                  >
                    {isSelectionMode && (
                      <td className="py-3 px-4" onClick={e => handleSelectOne(alert._id, e)}>
                        {selectedIds.has(alert._id)
                          ? <CheckSquare className="w-4 h-4 text-[#d4af37]" />
                          : <Square className="w-4 h-4 text-gray-600" />
                        }
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold text-white">{alert.device}</div>
                      {alert.deviceIp && <div className="text-xs text-gray-500 font-mono">{alert.deviceIp}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-300">{alert.message}</div>
                      {alert.duplicate_count > 0 && (
                        <span className="inline-block mt-0.5 text-xs text-gray-500">
                          ×{alert.duplicate_count + 1} occurrences
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {formatTime(alert.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="py-3 px-4">
                      {!isViewer && (
                        <div className="flex items-center gap-3">
                          {(alert.status === "NEW" || alert.status === "ACKNOWLEDGED") && (
                            <button
                              onClick={e => handleResolve(alert._id, e)}
                              disabled={actionLoading === alert._id}
                              className="px-2 py-1 text-sm text-green-500 hover:text-green-400 hover:bg-green-500/10 rounded font-medium disabled:opacity-40 transition-all"
                            >
                              {actionLoading === alert._id ? "..." : "Resolve"}
                            </button>
                          )}
                          {alert.status === "NEW" && (
                            <button
                              onClick={e => handleAcknowledge(alert._id, e)}
                              disabled={actionLoading === alert._id}
                              className="px-2 py-1 text-sm text-[#d4af37] hover:text-[#f59e0b] hover:bg-[#d4af37]/10 rounded font-medium disabled:opacity-40 transition-all"
                            >
                              {actionLoading === alert._id ? "..." : "Acknowledge"}
                            </button>
                          )}
                          {(alert.status === "RESOLVED" || alert.status === "CLOSED") && (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {total > 0 ? `${alerts.length} of ${total} alerts` : "No alerts"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 border border-[#2a2a2a] text-gray-400 rounded text-sm hover:bg-[#0a0a0a] disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${page === p
                    ? "bg-[#d4af37] text-black"
                    : "border border-[#2a2a2a] text-gray-400 hover:bg-[#0a0a0a]"
                    }`}
                >
                  {p}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-gray-600 text-sm">…{totalPages}</span>}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-3 py-1 border border-[#2a2a2a] text-gray-400 rounded text-sm hover:bg-[#0a0a0a] disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Alert Detail Drawer */}
      {selectedAlert && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end justify-end z-50"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="bg-[#1a1a1a] border-l border-[#2a2a2a] w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Alert Details</h2>
                <SeverityBadge severity={selectedAlert.severity} />
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <DetailRow label="Device" value={selectedAlert.device} />
              {selectedAlert.deviceIp && <DetailRow label="IP Address" value={selectedAlert.deviceIp} mono />}
              <DetailRow label="Message" value={selectedAlert.message} />
              {selectedAlert.metric && (
                <DetailRow label="Metric" value={`${selectedAlert.metric}: ${selectedAlert.metric_value ?? "N/A"}`} />
              )}
              <div>
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <StatusBadge status={selectedAlert.status} />
              </div>
              {selectedAlert.acknowledgedBy && (
                <DetailRow label="Acknowledged By" value={selectedAlert.acknowledgedBy} />
              )}
              {selectedAlert.duplicate_count > 0 && (
                <DetailRow label="Occurrences" value={`${selectedAlert.duplicate_count + 1}× (deduplicated)`} />
              )}
              <DetailRow label="First Seen" value={formatTime(selectedAlert.createdAt)} mono />
              <DetailRow label="Last Updated" value={formatTime(selectedAlert.updatedAt)} mono />

              <div className="pt-4 border-t border-[#2a2a2a]">
                <h3 className="font-medium text-white mb-3">Recommended Actions</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-[#d4af37]">•</span><span>Investigate device logs for additional context</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#d4af37]">•</span><span>Check device connectivity and network status</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#d4af37]">•</span><span>Review recent configuration changes</span></li>
                </ul>
              </div>

              {!isViewer && (
                <div className="flex gap-3 pt-2">
                  {(selectedAlert.status === "NEW" || selectedAlert.status === "ACKNOWLEDGED") && (
                    <button
                      onClick={() => handleResolve(selectedAlert._id)}
                      disabled={actionLoading === selectedAlert._id}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-40"
                    >
                      {actionLoading === selectedAlert._id ? "Working…" : "Mark Resolved"}
                    </button>
                  )}
                  {selectedAlert.status === "NEW" && (
                    <button
                      onClick={() => handleAcknowledge(selectedAlert._id)}
                      disabled={actionLoading === selectedAlert._id}
                      className="flex-1 px-4 py-2.5 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors font-semibold disabled:opacity-40"
                    >
                      {actionLoading === selectedAlert._id ? "Working…" : "Acknowledge"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/30",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  };
  const icons: Record<string, React.ReactNode> = {
    critical: <XCircle className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    info: <CheckCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[severity] || styles.info}`}>
      {icons[severity] || icons.info}
      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { style: string; icon: React.ReactNode; label: string }> = {
    NEW: { style: "bg-gray-500/10 text-gray-400 border-gray-500/30", icon: <Bell className="w-3 h-3" />, label: "New" },
    ACKNOWLEDGED: { style: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <Clock className="w-3 h-3" />, label: "Acknowledged" },
    RESOLVED: { style: "bg-green-500/10 text-green-400 border-green-500/30", icon: <CheckCircle className="w-3 h-3" />, label: "Resolved" },
    CLOSED: { style: "bg-gray-600/10 text-gray-500 border-gray-600/30", icon: <CheckCircle className="w-3 h-3" />, label: "Closed" },
  };
  const cfg = map[status] || map.NEW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.style}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-sm text-gray-400 mb-0.5">{label}</div>
      <div className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}