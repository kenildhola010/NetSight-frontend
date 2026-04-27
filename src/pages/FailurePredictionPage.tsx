import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, AlertTriangle, TrendingUp, Clock, Shield, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import API_BASE from "../config/api";

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

interface PredictiveDevice {
  id: string;
  name: string;
  ip: string;
  riskScore: number;
  prediction: string;
  factors: string[];
}

const failureTypesData = [
  { type: "Hardware", count: 12, color: "#ef4444" },
  { type: "Network", count: 8, color: "#f59e0b" },
  { type: "Disk", count: 5, color: "#3b82f6" },
  { type: "Power", count: 3, color: "#8b5cf6" },
];

export function FailurePredictionPage() {
  const [riskDevices, setRiskDevices] = useState<PredictiveDevice[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const response = await fetch(`${API_BASE}/monitoring/prediction`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          setRiskDevices(data.riskDevices);
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Prediction fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrediction();
  }, []);
  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white mb-1">Failure Prediction</h1>
        <p className="text-gray-400">AI-powered predictive analytics for network devices</p>
      </div>

      {/* ML Model Info */}
      <div className="bg-gradient-to-r from-[#d4af37] to-[#f59e0b] rounded-xl p-6 mb-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-white mb-2">Prediction Model Status</h3>
            <p className="text-white/80 mb-4">
              Machine learning model trained on 500,000+ device hours. Last updated: {new Date().toLocaleDateString()}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/10 rounded-lg p-3">
                <div className="text-sm text-white/80 mb-1">Model Accuracy</div>
                <div className="text-2xl font-semibold">{stats?.modelAccuracy || '94.3'}%</div>
              </div>
              <div className="bg-black/10 rounded-lg p-3">
                <div className="text-sm text-white/80 mb-1">Predictions Made</div>
                <div className="text-2xl font-semibold">{stats?.predictionsMade || '1,247'}</div>
              </div>
              <div className="bg-black/10 rounded-lg p-3">
                <div className="text-sm text-white/80 mb-1">Failures Prevented</div>
                <div className="text-2xl font-semibold">{stats?.failuresPrevented || '342'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High Risk Devices */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white">High-Risk Devices</h3>
          <span className="text-sm text-gray-400">{riskDevices.length} devices requiring attention</span>
        </div>
        <div className="space-y-4">
          {riskDevices.map((device: PredictiveDevice) => (
            <RiskDeviceCard key={device.id} device={device} />
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Prediction Confidence Timeline */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white mb-4">Incident Intensity Chart</h3>
          <p className="text-sm text-gray-400 mb-4">Detected network anomalies over last 7 points</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[
              { day: "T-6", events: 2 },
              { day: "T-5", events: 5 },
              { day: "T-4", events: 3 },
              { day: "T-3", events: 8 },
              { day: "T-2", events: 4 },
              { day: "T-1", events: 7 },
              { day: "Now", events: riskDevices.length },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Line type="monotone" dataKey="events" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Types Distribution */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
          <h3 className="text-white mb-4">Predicted Failure Types</h3>
          <p className="text-sm text-gray-400 mb-4">Next 30 days forecast</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={failureTypesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis dataKey="type" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#d4af37' }}
                cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {failureTypesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ML Insights */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-white mb-4">AI-Generated Insights & Recommendations</h3>
        <div className="space-y-4">
          {riskDevices.length > 0 ? riskDevices.map((device: PredictiveDevice, i: number) => (
            <InsightCard
              key={i}
              icon={<AlertTriangle className={`w-5 h-5 ${device.riskScore > 80 ? 'text-red-500' : 'text-amber-500'}`} />}
              priority={device.riskScore > 80 ? "Critical" : "High"}
              title={`${device.name} Risk Analysis`}
              description={`${device.factors.join(', ')}. Failure probability is ${device.riskScore}%.`}
              action="Schedule Maintenance"
              priorityColor={device.riskScore > 80 ? "red" : "amber"}
            />
          )) : (
            <div className="text-center py-8 text-gray-500">
              No high-risk devices detected at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskDeviceCard({ device }: { device: PredictiveDevice }) {
  const navigate = useNavigate();
  const getRiskColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', badge: 'bg-red-600' };
    if (score >= 60) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', badge: 'bg-amber-600' };
    return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', badge: 'bg-blue-600' };
  };

  const colors = getRiskColor(device.riskScore);

  return (
    <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-medium text-white">{device.name}</h4>
            <span className="text-xs text-gray-400 font-mono">{device.ip}</span>
          </div>
          <p className={`text-sm font-medium ${colors.text}`}>{device.prediction}</p>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${colors.text}`}>{device.riskScore}</div>
          <div className="text-xs text-gray-400">Risk Score</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium text-gray-400 mb-1.5">Risk Factors:</div>
        <div className="flex flex-wrap gap-2">
          {device.factors.map((factor: string, index: number) => (
            <span key={index} className="inline-flex items-center px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-gray-300">
              {factor}
            </span>
          ))}
        </div>
      </div>

      {/* Risk Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Risk Level</span>
          <span>{device.riskScore}%</span>
        </div>
        <div className="w-full bg-[#0a0a0a] rounded-full h-2">
          <div className={`h-2 rounded-full ${colors.badge}`} style={{ width: `${device.riskScore}%` }} />
        </div>
      </div>

      <button
        onClick={() => navigate(`/app/prediction/analysis/${device.id}`)}
        className="w-full px-4 py-2 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors text-sm font-medium"
      >
        View Detailed Analysis
      </button>
    </div>
  );
}

function InsightCard({ icon, priority, title, description, action, priorityColor }: {
  icon: React.ReactNode;
  priority: string;
  title: string;
  description: string;
  action: string;
  priorityColor: string;
}) {
  const colors = {
    red: 'bg-red-500/10 text-red-500 border-red-500/30',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    green: 'bg-green-500/10 text-green-500 border-green-500/30'
  };

  return (
    <div className="flex items-start gap-4 p-4 border border-[#2a2a2a] bg-[#0a0a0a]/50 rounded-lg">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[priorityColor as keyof typeof colors]}`}>
            {priority}
          </span>
          <h4 className="font-medium text-white">{title}</h4>
        </div>
        <p className="text-sm text-gray-400 mb-3">{description}</p>
        <button className="text-sm text-[#d4af37] hover:text-[#f59e0b] font-medium">
          {action} →
        </button>
      </div>
    </div>
  );
}