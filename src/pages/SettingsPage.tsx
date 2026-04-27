import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Bell, Shield, Activity, Clock, Search, AlertTriangle, X, Loader2 } from "lucide-react";
import API_BASE from "../config/api";

export function SettingsPage() {
  const navigate = useNavigate();
  const [showRescanModal, setShowRescanModal] = useState(false);
  const [rescanPassword, setRescanPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [rescanError, setRescanError] = useState("");

  const handleRescanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setRescanError("");

    try {
      const userData = localStorage.getItem('user');
      if (!userData) throw new Error("User session not found");
      const { user } = JSON.parse(userData);

      const response = await fetch(API_BASE + "/auth/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: rescanPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error("Incorrect password");

      let token = "";
      if (userData) {
        const parsed = JSON.parse(userData);
        token = parsed?.token || parsed?.tokens?.accessToken || "";
      }

      const clearRes = await fetch(API_BASE + "/devices/clear", {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!clearRes.ok) {
        console.error("Failed to clear devices before rescan");
      }

      setShowRescanModal(false);
      navigate('/setup', { state: { isRescan: true } });
    } catch (err: any) {
      setRescanError(err.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const [settings, setSettings] = useState({
    // Alert Thresholds
    latencyThreshold: 50,
    packetLossThreshold: 1,
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 20,

    // Scan Intervals
    quickScanInterval: 5,
    fullScanInterval: 60,
    healthCheckInterval: 10,

    // Notifications
    emailNotifications: true,
    slackNotifications: false,
    smsNotifications: false,
    criticalAlertsOnly: false,

    // Security
    sessionTimeout: 30,
    mfaEnabled: true,
    ipWhitelisting: false,
    auditLogging: true
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const userData = localStorage.getItem("user");
        let token = "";
        if (userData) {
          const parsed = JSON.parse(userData);
          token = parsed?.token || "";
        }

        const res = await fetch("http://localhost:5000/api/v1/settings", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      const userData = localStorage.getItem("user");
      let token = "";
      if (userData) {
        const parsed = JSON.parse(userData);
        token = parsed?.token || "";
      }

      const res = await fetch("http://localhost:5000/api/v1/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (err) {
      alert("Error saving settings");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white mb-1">System Settings</h1>
        <p className="text-gray-400">Configure alert thresholds, scan intervals, and system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alert Thresholds */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white">Alert Thresholds</h3>
                <p className="text-sm text-gray-400">Configure when alerts are triggered</p>
              </div>
            </div>

            <div className="space-y-5">
              <SettingSlider
                label="Latency Threshold"
                value={settings.latencyThreshold}
                onChange={(value) => setSettings({ ...settings, latencyThreshold: value })}
                min={10}
                max={200}
                unit="ms"
                description="Alert when latency exceeds this value"
              />
              <SettingSlider
                label="Packet Loss Threshold"
                value={settings.packetLossThreshold}
                onChange={(value) => setSettings({ ...settings, packetLossThreshold: value })}
                min={0.1}
                max={5}
                step={0.1}
                unit="%"
                description="Alert when packet loss exceeds this percentage"
              />
              <SettingSlider
                label="CPU Usage Threshold"
                value={settings.cpuThreshold}
                onChange={(value) => setSettings({ ...settings, cpuThreshold: value })}
                min={50}
                max={100}
                unit="%"
                description="Alert when CPU usage exceeds this percentage"
              />
              <SettingSlider
                label="Memory Usage Threshold"
                value={settings.memoryThreshold}
                onChange={(value) => setSettings({ ...settings, memoryThreshold: value })}
                min={50}
                max={100}
                unit="%"
                description="Alert when memory usage exceeds this percentage"
              />
              <SettingSlider
                label="Disk Space Threshold"
                value={settings.diskThreshold}
                onChange={(value) => setSettings({ ...settings, diskThreshold: value })}
                min={10}
                max={50}
                unit="% free"
                description="Alert when free disk space falls below this percentage"
              />
            </div>
          </div>

          {/* Scan Intervals */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white">Scan Intervals</h3>
                <p className="text-sm text-gray-400">Configure how often devices are scanned</p>
              </div>
            </div>

            <div className="space-y-5">
              <SettingSlider
                label="Quick Scan Interval"
                value={settings.quickScanInterval}
                onChange={(value) => setSettings({ ...settings, quickScanInterval: value })}
                min={1}
                max={30}
                unit="minutes"
                description="Ping-based device availability check"
              />
              <SettingSlider
                label="Full Scan Interval"
                value={settings.fullScanInterval}
                onChange={(value) => setSettings({ ...settings, fullScanInterval: value })}
                min={15}
                max={240}
                unit="minutes"
                description="Complete device discovery and metrics collection"
              />
              <SettingSlider
                label="Health Check Interval"
                value={settings.healthCheckInterval}
                onChange={(value) => setSettings({ ...settings, healthCheckInterval: value })}
                min={5}
                max={60}
                unit="minutes"
                description="Device health and performance metrics update"
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white">Notification Preferences</h3>
                <p className="text-sm text-gray-400">Choose how you receive alerts</p>
              </div>
            </div>

            <div className="space-y-4">
              <SettingToggle
                label="Email Notifications"
                description="Receive alerts via email"
                checked={settings.emailNotifications}
                onChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
              <SettingToggle
                label="Slack Notifications"
                description="Send alerts to Slack channel"
                checked={settings.slackNotifications}
                onChange={(checked) => setSettings({ ...settings, slackNotifications: checked })}
              />
              <SettingToggle
                label="SMS Notifications"
                description="Receive critical alerts via SMS"
                checked={settings.smsNotifications}
                onChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
              />
              <SettingToggle
                label="Critical Alerts Only"
                description="Only receive notifications for critical severity alerts"
                checked={settings.criticalAlertsOnly}
                onChange={(checked) => setSettings({ ...settings, criticalAlertsOnly: checked })}
              />
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white">Security Settings</h3>
                <p className="text-sm text-gray-400">Configure security and access controls</p>
              </div>
            </div>

            <div className="space-y-5">
              <SettingSlider
                label="Session Timeout"
                value={settings.sessionTimeout}
                onChange={(value) => setSettings({ ...settings, sessionTimeout: value })}
                min={15}
                max={120}
                unit="minutes"
                description="Automatically log out inactive users"
              />
              <SettingToggle
                label="Two-Factor Authentication"
                description="Require 2FA for all user logins"
                checked={settings.mfaEnabled}
                onChange={(checked) => setSettings({ ...settings, mfaEnabled: checked })}
              />
              <SettingToggle
                label="IP Whitelisting"
                description="Restrict access to specific IP addresses"
                checked={settings.ipWhitelisting}
                onChange={(checked) => setSettings({ ...settings, ipWhitelisting: checked })}
              />
              <SettingToggle
                label="Audit Logging"
                description="Log all user actions and system events"
                checked={settings.auditLogging}
                onChange={(checked) => setSettings({ ...settings, auditLogging: checked })}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save Actions */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <h4 className="font-medium text-white mb-4">Save Changes</h4>
            <button
              onClick={handleSave}
              className="w-full px-4 py-2.5 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Changes will take effect immediately across all monitored devices.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
            <h4 className="font-medium text-white mb-4">Configuration Status</h4>
            <div className="space-y-3">
              <QuickStat label="Total Settings" value="15" />
              <QuickStat label="Last Modified" value="Today" />
              <QuickStat label="Modified By" value="John Doe" />
            </div>
          </div>

          {/* Network Operations */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-medium">Danger Zone</h4>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Rescanning the network will clear all current devices and rediscover them.
            </p>
            <button
              onClick={() => { setRescanPassword(""); setRescanError(""); setShowRescanModal(true); }}
              className="w-full px-4 py-2.5 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Rescan Network
            </button>
          </div>

          {/* Help */}
          <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl p-6">
            <h4 className="font-medium text-[#d4af37] mb-2">Need Help?</h4>
            <p className="text-sm text-gray-300 mb-4">
              View our documentation for detailed configuration guidelines.
            </p>
            <button
              onClick={() => navigate('/docs')}
              className="text-sm text-[#d4af37] hover:text-[#f59e0b] font-medium">
              View Documentation →
            </button>
          </div>
        </div>
      </div>

      {/* Rescan Password Modal */}
      {showRescanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h3 className="text-white font-medium">Authentication Required</h3>
              <button
                onClick={() => setShowRescanModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescanSubmit} className="p-6">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-white font-medium mb-1">Confirm Identity</h4>
                <p className="text-sm text-gray-400">
                  Please enter your password to authorize a full network rescan. This action will reset your active device topology.
                </p>
              </div>

              {rescanError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {rescanError}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={rescanPassword}
                    onChange={e => setRescanPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowRescanModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#2a2a2a] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !rescanPassword}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingSlider({ label, value, onChange, min, max, step = 1, unit, description }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
        <div className="text-sm font-semibold text-[#d4af37]">
          {value} {unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
      />
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#d4af37]' : 'bg-[#2a2a2a]'
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}