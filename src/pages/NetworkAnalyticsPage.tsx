import { useState, useEffect, useRef } from "react";
import { Download, TrendingUp, TrendingDown, Activity, Calendar } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { exportNetworkReport } from "../utils/networkReportExport";

import API_BASE from "../config/api";

interface LatencyPoint {
  time: string;
  value: number;
  packetLoss: number;
}

interface TrafficPoint {
  period: string;
  value: number;
}

interface DeviceRef {
  name: string;
  ip: string;
  latency: number;
  packetLoss: number;
  status: string;
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

export function NetworkAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [latencyData, setLatencyData] = useState<LatencyPoint[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficPoint[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [devicePerformance, setDevicePerformance] = useState<DeviceRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams({ range: timeRange });
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        const qs = queryParams.toString();

        const [latencyRes, trafficRes, statsRes, devicesRes] = await Promise.all([
          fetch(`${API_BASE}/monitoring/latency-trend?${qs}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/monitoring/traffic?${qs}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/monitoring/dashboard?${qs}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/monitoring/devices`, { headers: getAuthHeaders() }),
        ]);

        const [latencyD, trafficD, statsD, devicesD] = await Promise.all([
          latencyRes.json(),
          trafficRes.json(),
          statsRes.json(),
          devicesRes.json(),
        ]);

        if (latencyD.success) setLatencyData(latencyD.trend);
        if (trafficD.success) setTrafficData(trafficD.traffic);
        if (statsD.success) setSummaryStats(statsD.stats);
        if (devicesD.success) setDevicePerformance(devicesD.devices);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, startDate, endDate]);

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const selectEl = reportRef.current?.querySelector("select");
      const rangeLabel = selectEl ? selectEl.options[selectEl.selectedIndex]?.text : timeRange;
      exportNetworkReport(summaryStats, latencyData, trafficData, devicePerformance, startDate, endDate, rangeLabel);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={reportRef} id="analytics-report-content" className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-1">Network Analytics</h1>
            <p className="text-gray-400">Performance insights and trends</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Start Date Selector */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#d4af37]/50 transition-colors group">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Start Date</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#d4af37]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                  />
                </div>
              </div>
            </div>

            {/* End Date Selector */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#d4af37]/50 transition-colors group">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">End Date</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#d4af37]" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                  />
                </div>
              </div>
            </div>
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                if (e.target.value !== "custom") {
                  setStartDate("");
                  setEndDate("");
                }
              }}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button
              onClick={handleExportReport}
              disabled={isExporting}
              className="px-4 py-2 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#1a1a1a] disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Generating..." : "Export Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <MetricCard
          label="Avg Network Latency"
          value={`${summaryStats?.avgLatency || 0}ms`}
          subtitle="real-time"
        />
        <MetricCard
          label="Total Bandwidth"
          value={`${(((summaryStats?.totalTrafficIn || 0) + (summaryStats?.totalTrafficOut || 0)) / 1048576).toFixed(1)} MB`}
          subtitle="live usage"
        />
        <MetricCard
          label="Critical Alerts"
          value={summaryStats?.criticalAlerts || 0}
          subtitle="current status"
        />
        <MetricCard
          label="Network Uptime"
          value={`${summaryStats?.uptimePercent || 0}%`}
          subtitle="last 24h"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Latency Trends */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white mb-4">Latency Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} name="Avg Latency (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Packet Loss */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white mb-4">Packet Loss Rate</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="packetLossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Area type="monotone" dataKey="packetLoss" stroke="#ef4444" fill="url(#packetLossGradient)" strokeWidth={2} name="Pack Loss %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bandwidth Usage */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <h3 className="text-white mb-4">Traffic Usage (Last 24 Hours)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#d4af37' }}
              cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }}
            />
            <Legend
              wrapperStyle={{ color: '#9ca3af' }}
              iconType="circle"
            />
            <Bar dataKey="value" fill="#d4af37" name="Traffic (MB)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Insights */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <h3 className="text-white mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            title="Real-time Status"
            description={`Currently monitoring ${devicePerformance.length} devices with ${summaryStats?.onlineDevices || 0} online.`}
            sentiment="neutral"
          />
          <InsightCard
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            title="Current Latency"
            description={summaryStats?.avgLatency < 50 ? "Network latency is optimal." : "High latency detected in some segments."}
            sentiment={summaryStats?.avgLatency < 50 ? "positive" : "warning"}
          />
          <InsightCard
            icon={<Activity className="w-5 h-5 text-amber-500" />}
            title="Active Alerts"
            description={summaryStats?.activeAlerts > 0 ? `There are ${summaryStats?.activeAlerts} active alerts requiring attention.` : "No active alerts detected."}
            sentiment={summaryStats?.activeAlerts > 0 ? "warning" : "positive"}
          />
        </div>
      </div>

      {/* Device Performance Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#2a2a2a]">
          <h3 className="text-white">Device Performance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Device</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Avg Latency</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Packet Loss</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Health</th>
              </tr>
            </thead>
            <tbody>
              {devicePerformance.map((device: DeviceRef, index: number) => (
                <tr key={index} className="border-b border-[#2a2a2a]">
                  <td className="py-3 px-4 text-sm font-medium text-white">{device.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 font-mono">{device.ip}</td>
                  <td className="py-3 px-4 text-sm text-gray-300">{device.latency}ms</td>
                  <td className="py-3 px-4 text-sm text-gray-300">{device.packetLoss}%</td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    <span className={`px-2 py-1 rounded text-xs ${device.status === 'Online' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <HealthBar uptime={device.status === 'Online' ? 100 : 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, trend, subtitle }: {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  subtitle: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className="text-3xl font-semibold text-white mb-2">{value}</div>
      <div className="flex items-center gap-2">
        {change && (
          <span className={`inline-flex items-center gap-1 text-sm font-medium ${trend === 'down' ? 'text-green-500' : 'text-blue-500'
            }`}>
            {trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            {change}
          </span>
        )}
        <span className="text-sm text-gray-500">{subtitle}</span>
      </div>
    </div>
  );
}

function InsightCard({ icon, title, description, sentiment }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'warning';
}) {
  const colors = {
    positive: 'border-green-500/30 bg-green-500/10',
    neutral: 'border-blue-500/30 bg-blue-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10'
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[sentiment]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-medium text-white">{title}</h4>
      </div>
      <p className="text-sm text-gray-300">{description}</p>
    </div>
  );
}

function HealthBar({ uptime }: { uptime: number }) {
  let color = 'bg-green-500';
  if (uptime < 98) color = 'bg-red-500';
  else if (uptime < 99) color = 'bg-amber-500';

  return (
    <div className="w-full bg-[#0a0a0a] rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${uptime}%` }} />
    </div>
  );
}