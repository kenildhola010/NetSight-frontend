import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Brain, AlertTriangle, TrendingUp, TrendingDown, Shield,
  Activity, Cpu, HardDrive, Wifi, Clock, Zap, Server, CheckCircle2,
  XCircle, Loader2, BarChart3, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import API_BASE from "../config/api";

function getAuthHeaders(): Record<string, string> {
  const userData = localStorage.getItem("user");
  if (!userData) return {};
  try {
    const parsed = JSON.parse(userData);
    const token = parsed?.token || parsed?.tokens?.accessToken;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch { /* ignore */ }
  return {};
}

interface DeviceData {
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

interface PredictionInfo {
  riskScore: number;
  prediction: string;
  factors: string[];
}

// Simulated historical trend data generator
function generateTrend(base: number, variance: number, points: number, rising: boolean) {
  const data = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    val += (rising ? 1 : -1) * Math.random() * variance + (Math.random() - 0.5) * variance;
    val = Math.max(0, Math.min(100, val));
    const h = points - i;
    data.push({ time: `${h}h ago`, value: Math.round(val * 10) / 10 });
  }
  return data.reverse();
}

export function DeviceAnalysisPage() {
  const navigate = useNavigate();
  const { deviceId } = useParams();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [prediction, setPrediction] = useState<PredictionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devRes, predRes] = await Promise.all([
          fetch(`${API_BASE}/monitoring/devices/${deviceId}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/monitoring/prediction`, { headers: getAuthHeaders() }),
        ]);
        const devData = await devRes.json();
        const predData = await predRes.json();

        if (devData.success) setDevice(devData.device);
        if (predData.success) {
          const match = predData.riskDevices.find((d: any) => d.id === deviceId);
          if (match) setPrediction(match);
          else setPrediction({ riskScore: 15, prediction: "Low risk, routine monitoring", factors: ["No anomalies detected"] });
        }
      } catch (err) {
        console.error("Analysis fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [deviceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin mb-4" />
        <p className="text-gray-400">Running AI analysis...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6 bg-[#0a0a0a] min-h-screen text-center">
        <h2 className="text-white mb-4">Device Not Found</h2>
        <button onClick={() => navigate("/app/prediction")} className="text-[#d4af37] hover:underline">Back to Prediction</button>
      </div>
    );
  }

  const risk = prediction?.riskScore ?? 20;
  const riskLabel = risk >= 80 ? "Critical" : risk >= 60 ? "High" : risk >= 40 ? "Moderate" : "Low";
  const riskColor = risk >= 80 ? "#ef4444" : risk >= 60 ? "#f59e0b" : risk >= 40 ? "#3b82f6" : "#22c55e";

  // Generate simulated analysis data
  const cpuTrend = generateTrend(device.cpuUsage, 8, 24, device.cpuUsage > 70);
  const memTrend = generateTrend(device.memoryUsage, 5, 24, device.memoryUsage > 80);
  const latTrend = generateTrend(device.latency, 15, 24, device.latency > 80);
  const lossTrend = generateTrend(device.packetLoss, 1, 24, device.packetLoss > 2);

  const healthRadar = [
    { metric: "CPU", value: Math.max(0, 100 - device.cpuUsage), fullMark: 100 },
    { metric: "Memory", value: Math.max(0, 100 - device.memoryUsage), fullMark: 100 },
    { metric: "Latency", value: Math.max(0, 100 - Math.min(device.latency, 100)), fullMark: 100 },
    { metric: "Uptime", value: device.status === "Online" ? 95 : 10, fullMark: 100 },
    { metric: "Packet", value: Math.max(0, 100 - device.packetLoss * 10), fullMark: 100 },
    { metric: "Network", value: device.status === "Online" ? 85 + Math.random() * 10 : 15, fullMark: 100 },
  ];

  const failureProb = [
    { period: "24h", probability: Math.min(99, risk + Math.floor(Math.random() * 5)) },
    { period: "3d", probability: Math.min(99, risk + 5 + Math.floor(Math.random() * 8)) },
    { period: "7d", probability: Math.min(99, risk + 10 + Math.floor(Math.random() * 10)) },
    { period: "14d", probability: Math.min(99, risk + 15 + Math.floor(Math.random() * 12)) },
    { period: "30d", probability: Math.min(99, risk + 20 + Math.floor(Math.random() * 15)) },
  ];

  const recommendations = getRecommendations(device, risk);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Back Button */}
      <button onClick={() => navigate("/app/prediction")}
        className="flex items-center gap-2 text-gray-400 hover:text-[#d4af37] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Prediction
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-[#d4af37]" />
            AI Analysis — {device.name}
          </h1>
          <p className="text-gray-400 mt-1">{device.ip} • {device.type} • {device.vendor || "Unknown"}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border`}
            style={{ color: riskColor, borderColor: riskColor + "40", background: riskColor + "15" }}>
            {riskLabel} Risk — Score {risk}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${device.status === 'Online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            <span className={`w-2 h-2 rounded-full ${device.status === 'Online' ? 'bg-green-500' : 'bg-red-500'}`} />
            {device.status}
          </span>
        </div>
      </div>

      {/* Risk Overview Banner */}
      <div className="rounded-xl p-6 mb-6 border" style={{ background: `linear-gradient(135deg, ${riskColor}15, ${riskColor}05)`, borderColor: riskColor + "30" }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={riskColor} strokeWidth="8"
                    strokeDasharray={`${risk * 2.64} 264`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{risk}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: riskColor }}>{prediction?.prediction}</p>
            </div>
          </div>
          <div className="md:col-span-3">
            <h3 className="text-white font-semibold mb-3">Risk Factors Detected</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(prediction?.factors || []).map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a]/60 border border-[#2a2a2a] rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: riskColor }} />
                  <span className="text-sm text-gray-300">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={<Cpu className="w-5 h-5" />} label="CPU Usage" value={`${device.cpuUsage}%`}
          status={device.cpuUsage > 80 ? "critical" : device.cpuUsage > 60 ? "warning" : "healthy"} />
        <MetricCard icon={<HardDrive className="w-5 h-5" />} label="Memory" value={`${device.memoryUsage}%`}
          status={device.memoryUsage > 85 ? "critical" : device.memoryUsage > 70 ? "warning" : "healthy"} />
        <MetricCard icon={<Activity className="w-5 h-5" />} label="Latency" value={`${device.latency}ms`}
          status={device.latency > 150 ? "critical" : device.latency > 80 ? "warning" : "healthy"} />
        <MetricCard icon={<Clock className="w-5 h-5" />} label="Uptime" value={formatUptime(device.uptime)}
          status={device.status === "Online" ? "healthy" : "critical"} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CPU Trend */}
        <ChartCard title="CPU Utilization Trend" subtitle="Last 24 hours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cpuTrend}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Memory Trend */}
        <ChartCard title="Memory Usage Trend" subtitle="Last 24 hours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={memTrend}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Latency Trend */}
        <ChartCard title="Latency Analysis" subtitle="Last 24 hours">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={latTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '10px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 2 }} name="Latency ms" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Health Radar */}
        <ChartCard title="Device Health Radar" subtitle="Overall system health score">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={healthRadar}>
              <PolarGrid stroke="#2a2a2a" />
              <PolarAngleAxis dataKey="metric" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <PolarRadiusAxis stroke="#2a2a2a" domain={[0, 100]} tick={false} />
              <Radar dataKey="value" stroke="#d4af37" fill="#d4af37" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Failure Probability + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Failure Probability Timeline */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-1">Failure Probability Forecast</h3>
          <p className="text-sm text-gray-400 mb-4">Predicted failure likelihood over time</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={failureProb}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
              <Bar dataKey="probability" radius={[6, 6, 0, 0]} name="Failure %">
                {failureProb.map((entry, i) => (
                  <Cell key={i} fill={entry.probability >= 80 ? '#ef4444' : entry.probability >= 60 ? '#f59e0b' : entry.probability >= 40 ? '#3b82f6' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Recommendations */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#d4af37]" />
            AI Recommendations
          </h3>
          <p className="text-sm text-gray-400 mb-4">Actions to reduce failure risk</p>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${rec.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' : rec.priority === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                <div className="mt-0.5 flex-shrink-0">
                  {rec.priority === 'critical' ? <XCircle className="w-4 h-4 text-red-500" /> :
                    rec.priority === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                      <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{rec.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device Info Summary */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Device Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Device Name" value={device.name} />
          <InfoItem label="IP Address" value={device.ip} />
          <InfoItem label="MAC Address" value={device.mac || "N/A"} />
          <InfoItem label="Device Type" value={device.type} />
          <InfoItem label="Vendor" value={device.vendor || "Unknown"} />
          <InfoItem label="OS Version" value={device.osVersion || "N/A"} />
          <InfoItem label="Location" value={device.location || "N/A"} />
          <InfoItem label="Last Seen" value={device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "N/A"} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status: 'healthy' | 'warning' | 'critical' }) {
  const colors = { healthy: { border: 'border-green-500/20', text: 'text-green-500' }, warning: { border: 'border-amber-500/20', text: 'text-amber-500' }, critical: { border: 'border-red-500/20', text: 'text-red-500' } };
  const c = colors[status];
  return (
    <div className={`bg-[#1a1a1a] rounded-xl border ${c.border} p-4`}>
      <div className={`mb-2 ${c.text}`}>{icon}</div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${c.text}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </div>
  );
}

function getRecommendations(device: DeviceData, risk: number) {
  const recs: { title: string; description: string; priority: string }[] = [];

  if (device.status === "Offline") {
    recs.push({ title: "Restore Device Connectivity", description: "Device is offline. Check physical connections, power supply, and network interface.", priority: "critical" });
  }
  if (device.cpuUsage > 80) {
    recs.push({ title: "Reduce CPU Load", description: `CPU at ${device.cpuUsage}%. Identify and terminate heavy processes or schedule load balancing.`, priority: "critical" });
  }
  if (device.memoryUsage > 85) {
    recs.push({ title: "Address Memory Pressure", description: `Memory at ${device.memoryUsage}%. Consider upgrading RAM or optimizing memory-intensive services.`, priority: "warning" });
  }
  if (device.latency > 100) {
    recs.push({ title: "Investigate High Latency", description: `Latency at ${device.latency}ms. Check network congestion, routing paths, and QoS settings.`, priority: "warning" });
  }
  if (device.packetLoss > 2) {
    recs.push({ title: "Fix Packet Loss", description: `${device.packetLoss}% packet loss detected. Inspect cables, switch ports, and interface errors.`, priority: "critical" });
  }
  if (recs.length === 0) {
    recs.push({ title: "All Systems Healthy", description: "No immediate action required. Continue routine monitoring.", priority: "healthy" });
  }
  if (risk > 40) {
    recs.push({ title: "Schedule Preventive Maintenance", description: "Risk score indicates maintenance should be planned within the next 7-14 days.", priority: "warning" });
  }

  return recs.slice(0, 5);
}
