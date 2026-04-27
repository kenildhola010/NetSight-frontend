import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  HardDrive,
  Cpu,
  Wifi,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Loader2,
  Trash2,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import API_BASE from "../config/api";

interface DeviceDetails {
  _id: string;
  name: string;
  ip: string;
  mac: string;
  type: string;
  vendor: string;
  status: string;
  latency: number;
  packetLoss: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  lastSeen: string;
  osVersion: string;
  location: string;
}

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

const logs = [
  { id: 1, timestamp: "2026-01-23 14:32:15", level: "warning", message: "High CPU usage detected (85%)" },
  { id: 2, timestamp: "2026-01-23 14:15:42", level: "info", message: "Device health check completed successfully" },
  { id: 3, timestamp: "2026-01-23 13:58:21", level: "error", message: "Failed ping response from 192.168.1.100" },
  { id: 4, timestamp: "2026-01-23 13:45:10", level: "info", message: "Configuration backup completed" },
  { id: 5, timestamp: "2026-01-23 13:30:05", level: "warning", message: "Disk space below 20%" },
  { id: 6, timestamp: "2026-01-23 13:12:33", level: "info", message: "Network scan initiated" },
];

export function DeviceDetailsPage() {
  const navigate = useNavigate();
  const { deviceId } = useParams();
  const [device, setDevice] = useState<DeviceDetails | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ latencyData: any[]; bandwidthData: any[] }>({
    latencyData: [],
    bandwidthData: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "logs">("overview");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deviceRes, metricsRes] = await Promise.all([
          fetch(`${API_BASE}/monitoring/devices/${deviceId}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/monitoring/devices/${deviceId}/metrics`, { headers: getAuthHeaders() })
        ]);

        const deviceData = await deviceRes.json();
        const metricsData = await metricsRes.json();

        if (deviceData.success) {
          setDevice(deviceData.device);
          setAlerts(deviceData.alerts || []);
        }
        if (metricsData.success) {
          setMetrics({
            latencyData: metricsData.latencyData,
            bandwidthData: metricsData.bandwidthData
          });
        }
      } catch (err) {
        console.error("Failed to fetch device details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [deviceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin mb-4" />
        <p className="text-gray-400">Loading device details...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6 bg-[#0a0a0a] min-h-screen text-center">
        <h2 className="text-white mb-4">Device Not Found</h2>
        <button onClick={() => navigate("/app/devices")} className="text-[#d4af37] hover:underline">
          Back to Devices
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        navigate("/app/devices");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete device");
      }
    } catch (err) {
      console.error("Failed to delete device:", err);
      alert("An error occurred while deleting the device");
    } finally {
      setDeleting(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/app/devices")}
          className="flex items-center gap-2 text-gray-400 hover:text-[#d4af37] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white mb-1">{device.name}</h1>
            <p className="text-gray-400">{device.ip} • {device.type} • {device._id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${device.status === 'Online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
              <span className={`w-2 h-2 rounded-full ${device.status === 'Online' ? 'bg-green-500' : 'bg-red-500'}`} />
              {device.status}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <DropdownMenuItem
                  onSelect={() => setIsDeleteDialogOpen(true)}
                  className="text-red-400 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <QuickStat
          label="Uptime"
          value={formatUptime(device.uptime)}
          trend="up"
          trendValue="Live"
          icon={<Clock className="w-5 h-5 text-[#d4af37]" />}
        />
        <QuickStat
          label="Latency"
          value={`${device.latency}ms`}
          trend={device.latency > 100 ? "up" : "down"}
          trendValue={device.latency > 100 ? "High" : "Low"}
          icon={<Activity className="w-5 h-5 text-green-500" />}
        />
        <QuickStat
          label="CPU Usage"
          value={`${device.cpuUsage}%`}
          trend={device.cpuUsage > 80 ? "up" : "down"}
          trendValue={device.cpuUsage > 80 ? "High" : "Normal"}
          icon={<Cpu className="w-5 h-5 text-amber-500" />}
        />
        <QuickStat
          label="Memory"
          value={`${device.memoryUsage}%`}
          trend={device.memoryUsage > 85 ? "up" : "down"}
          trendValue={device.memoryUsage > 85 ? "High" : "Normal"}
          icon={<HardDrive className="w-5 h-5 text-purple-500" />}
        />
      </div>

      {/* Tabs */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <div className="border-b border-[#2a2a2a]">
          <div className="flex gap-1 p-1">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              label="Overview"
            />
            <TabButton
              active={activeTab === "metrics"}
              onClick={() => setActiveTab("metrics")}
              label="Metrics"
            />
            <TabButton
              active={activeTab === "logs"}
              onClick={() => setActiveTab("logs")}
              label="Logs"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Device Information */}
              <div>
                <h3 className="text-white mb-4">Device Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow label="Device Name" value={device.name} />
                  <InfoRow label="IP Address" value={device.ip} />
                  <InfoRow label="MAC Address" value={device.mac} />
                  <InfoRow label="Device Type" value={device.type} />
                  <InfoRow label="OS Version" value={device.osVersion || "N/A"} />
                  <InfoRow label="Location" value={device.location || "N/A"} />
                  <InfoRow label="Manufacturer" value={device.vendor || "Unknown"} />
                  <InfoRow label="Last Seen" value={new Date(device.lastSeen).toLocaleString()} />
                </div>
              </div>

              {/* Current Status */}
              <div>
                <h3 className="text-white mb-4">Current Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatusCard
                    label="CPU Usage"
                    value={`${device.cpuUsage}%`}
                    status={device.cpuUsage > 90 ? "critical" : device.cpuUsage > 70 ? "warning" : "healthy"}
                    description={device.cpuUsage > 70 ? "Above normal thresholds" : "Within normal range"}
                  />
                  <StatusCard
                    label="Memory Usage"
                    value={`${device.memoryUsage}%`}
                    status={device.memoryUsage > 90 ? "critical" : device.memoryUsage > 70 ? "warning" : "healthy"}
                    description={device.memoryUsage > 80 ? "Elevated memory pressure" : "Stable performance"}
                  />
                  <StatusCard
                    label="Latency/Ping"
                    value={`${device.latency}ms`}
                    status={device.latency > 150 ? "critical" : device.latency > 80 ? "warning" : "healthy"}
                    description={device.latency > 100 ? "High network delay" : "Excellent connection"}
                  />
                </div>
              </div>

              {/* Active Alerts */}
              <div>
                <h3 className="text-white mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <AlertItem
                        key={alert._id}
                        severity={alert.severity}
                        message={alert.message}
                        time={new Date(alert.createdAt).toLocaleString()}
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl">
                      <p className="text-gray-400">No recent alerts for this device</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "metrics" && (
            <div className="space-y-6">
              {/* Latency Chart */}
              <div>
                <h3 className="text-white mb-4">Latency (Last 24 Hours)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={metrics.latencyData}>
                    <defs>
                      <linearGradient id="latencyGradient2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      labelStyle={{ color: '#ffffff' }}
                      itemStyle={{ color: '#d4af37' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#d4af37" fill="url(#latencyGradient2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Bandwidth Chart */}
              <div>
                <h3 className="text-white mb-4">Traffic (Last 24 Hours)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metrics.bandwidthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      labelStyle={{ color: '#ffffff' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} name="In (KB/s)" />
                    <Line type="monotone" dataKey="out" stroke="#d4af37" strokeWidth={2} name="Out (KB/s)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Metric Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricSummary
                  label="Current Latency"
                  value={`${device.latency}ms`}
                  change={device.latency > 100 ? "High" : "Optimal"}
                />
                <MetricSummary
                  label="Packet Loss"
                  value={`${device.packetLoss}%`}
                  change={device.packetLoss > 1 ? "Attention" : "Healthy"}
                />
                <MetricSummary
                  label="Data Points"
                  value={`${metrics.latencyData.length}`}
                  change="Last 24h"
                />
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white">Event Logs</h3>
                <div className="flex items-center gap-3">
                  <select className="px-3 py-1.5 border border-[#2a2a2a] bg-[#0a0a0a] text-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#d4af37]">
                    <option>All Levels</option>
                    <option>Error</option>
                    <option>Warning</option>
                    <option>Info</option>
                  </select>
                  <button className="px-3 py-1.5 border border-[#2a2a2a] bg-[#0a0a0a] text-gray-300 rounded-lg text-sm hover:bg-[#1a1a1a] hover:border-[#d4af37] transition-colors">
                    Export Logs
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom Delete Confirmation Modal */}
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Are you absolutely sure?</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  This will permanently delete <strong className="text-white">{device.name}</strong> ({device.ip}) and remove all its historical performance data. This action cannot be undone.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-transparent border border-[#2a2a2a] text-white font-medium rounded-xl hover:bg-[#2a2a2a] transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Device"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value, trend, trendValue, icon }: {
  label: string;
  value: string;
  trend: 'up' | 'down';
  trendValue: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-white mb-1">{value}</div>
      <div className={`text-sm flex items-center gap-1 ${trend === 'down' ? 'text-green-500' : 'text-red-500'}`}>
        {trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
        {trendValue}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20' : 'text-gray-400 hover:text-[#d4af37] hover:bg-[#0a0a0a]'
        }`}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function StatusCard({ label, value, status, description }: {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
}) {
  const colors = {
    healthy: 'border-green-500/20 bg-green-500/10',
    warning: 'border-amber-500/20 bg-amber-500/10',
    critical: 'border-red-500/20 bg-red-500/10'
  };

  const textColors = {
    healthy: 'text-green-500',
    warning: 'text-amber-500',
    critical: 'text-red-500'
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[status]}`}>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold mb-1 ${textColors[status]}`}>{value}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

function AlertItem({ severity, message, time }: { severity: string; message: string; time: string }) {
  return (
    <div className="flex items-start gap-3 p-3 border border-[#2a2a2a] bg-[#0a0a0a] rounded-lg hover:border-[#d4af37]/30 transition-colors">
      <AlertTriangle className={`w-5 h-5 mt-0.5 ${severity === 'warning' ? 'text-amber-500' : 'text-red-500'}`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{message}</div>
        <div className="text-xs text-gray-500 mt-1">{time}</div>
      </div>
    </div>
  );
}

function MetricSummary({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="p-4 border border-[#2a2a2a] bg-[#0a0a0a] rounded-lg">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{change} from avg</div>
    </div>
  );
}

function LogEntry({ log }: { log: typeof logs[0] }) {
  const levelColors = {
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    info: 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20'
  };

  return (
    <div className="flex items-start gap-3 p-3 border border-[#2a2a2a] bg-[#0a0a0a] rounded-lg hover:border-[#d4af37]/30 transition-colors">
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColors[log.level as keyof typeof levelColors]}`}>
        {log.level.toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white">{log.message}</div>
        <div className="text-xs text-gray-500 mt-0.5 font-mono">{log.timestamp}</div>
      </div>
    </div>
  );
}
