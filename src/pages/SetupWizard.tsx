import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Network,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Router,
  Server,
  Laptop,
  Wifi,
  Shield,
  Printer,
  Monitor,
  Pencil,
  AlertCircle,
  Download,
  Copy,
  Key,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface ScannedDevice {
  ip: string;
  mac: string;
  type: string;
  vendor: string;
  status: string;
  name: string;
  hostname: string;
  openPorts: { port: number; service: string }[];
  isGateway: boolean;
  isSelf: boolean;
  excluded: boolean;
}

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

const deviceIcons: Record<string, React.ReactNode> = {
  Router: <Router className="w-5 h-5" />,
  Switch: <Network className="w-5 h-5" />,
  Server: <Server className="w-5 h-5" />,
  Workstation: <Laptop className="w-5 h-5" />,
  "Access Point": <Wifi className="w-5 h-5" />,
  Firewall: <Shield className="w-5 h-5" />,
  Printer: <Printer className="w-5 h-5" />,
  Other: <Monitor className="w-5 h-5" />,
};

const deviceColors: Record<string, string> = {
  Router: "text-blue-400",
  Switch: "text-cyan-400",
  Server: "text-green-400",
  Workstation: "text-purple-400",
  "Access Point": "text-amber-400",
  Firewall: "text-red-400",
  Printer: "text-gray-400",
  Other: "text-gray-400",
};

export function SetupWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRescan = location.state?.isRescan || false;

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [editingDevice, setEditingDevice] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Agent key state — may need to be generated on this page
  const [agentKey, setAgentKey] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentScanned, setAgentScanned] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const serverUrl = "netsight-backend-production.up.railway.app";

  // On mount: check if a key already exists, if not generate one
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed?.user?.pendingAgentKey) {
        setAgentKey(parsed.user.pendingAgentKey);
      } else {
        // No key exists — generate one now
        generateAgentKey();
      }
    }
  }, []);

  const generateAgentKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await fetch(`${API_BASE}/settings/agent-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: "Default Agent" }),
      });
      const data = await res.json();
      if (data.success && data.agentKey) {
        setAgentKey(data.agentKey);
        // Also save to localStorage so it persists
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsed = JSON.parse(userData);
          parsed.user = { ...parsed.user, pendingAgentKey: data.agentKey };
          localStorage.setItem("user", JSON.stringify(parsed));
        }
      } else {
        setError("Failed to generate agent key");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate agent key");
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string, type: "key" | "url") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // Poll backend to check if agent has connected and scanned
  const checkForAgentDevices = useCallback(async () => {
    try {
      // Check agent status
      const agentsRes = await fetch(`${API_BASE}/settings/agents`, {
        headers: getAuthHeaders(),
      });
      const agentsData = await agentsRes.json();
      if (agentsData.success && agentsData.agents?.length > 0) {
        const onlineAgent = agentsData.agents.find((a: any) => a.status === "Online");
        if (onlineAgent) {
          setAgentConnected(true);
        }
      }

      // Check if devices exist (sent by agent)
      const devicesRes = await fetch(`${API_BASE}/devices`, {
        headers: getAuthHeaders(),
      });
      const devicesData = await devicesRes.json();
      const deviceList = devicesData.devices || devicesData.data || devicesData || [];

      if (Array.isArray(deviceList) && deviceList.length > 0) {
        setAgentScanned(true);
        // Map to our format
        const scannedDevices: ScannedDevice[] = deviceList.map((d: any) => ({
          ip: d.ip,
          mac: d.mac,
          type: d.type || "Other",
          vendor: d.vendor || "Unknown",
          status: d.status || "Online",
          name: d.name || d.hostname || "",
          hostname: d.hostname || "",
          openPorts: d.openPorts || [],
          isGateway: d.isGateway || false,
          isSelf: false,
          excluded: false,
        }));
        setDevices(scannedDevices);
        // Auto-advance to step 2 (verify devices)
        setCurrentStep(2);
        setWaitingForAgent(false);
      }
    } catch (err) {
      // Silently fail — will try again
    }
    setPollCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!waitingForAgent) return;
    const interval = setInterval(checkForAgentDevices, 5000);
    return () => clearInterval(interval);
  }, [waitingForAgent, checkForAgentDevices]);

  const toggleExclude = (index: number) => {
    setDevices(
      devices.map((d, i) =>
        i === index ? { ...d, excluded: !d.excluded } : d
      )
    );
  };

  const handleDeviceNameChange = (index: number, name: string) => {
    setDevices(devices.map((d, i) => (i === index ? { ...d, name } : d)));
  };

  const activeDevices = devices.filter((d) => !d.excluded);
  const excludedCount = devices.filter((d) => d.excluded).length;

  const handleCompleteSetup = async () => {
    setSaving(true);
    setError("");

    try {
      const devicesToSave = activeDevices.map((d) => ({
        ip: d.ip,
        mac: d.mac,
        type: d.type,
        status: d.status,
        name: d.name,
        hostname: d.hostname,
        vendor: d.vendor,
        openPorts: d.openPorts,
        isGateway: d.isGateway,
      }));

      const response = await fetch(`${API_BASE}/devices/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ devices: devicesToSave }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save devices");
      }

      // Update local storage to reflect setup completion
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsed = JSON.parse(userData);
        parsed.user = { ...parsed.user, setupCompleted: true };
        localStorage.setItem("user", JSON.stringify(parsed));
      }

      navigate("/app");
    } catch (err: any) {
      setSaving(false);
      setError(err.message || "Failed to complete setup");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-8 h-8 text-[#d4af37]" />
              <span className="text-xl font-semibold text-white">
                NetSight
              </span>
            </div>
            <div className="text-sm text-gray-400">{isRescan ? "Network Rescan" : "Setup Wizard"}</div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-[#2a2a2a]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <StepIndicator
              number={1}
              label="Setup Agent"
              active={currentStep === 1}
              completed={currentStep > 1}
            />
            <div
              className={`flex-1 h-px mx-4 ${currentStep > 1 ? "bg-[#d4af37]" : "bg-[#2a2a2a]"
                }`}
            />
            <StepIndicator
              number={2}
              label="Verify Devices"
              active={currentStep === 2}
              completed={currentStep > 2}
            />
            <div
              className={`flex-1 h-px mx-4 ${currentStep > 2 ? "bg-[#d4af37]" : "bg-[#2a2a2a]"
                }`}
            />
            <StepIndicator
              number={3}
              label="Confirm & Finish"
              active={currentStep === 3}
              completed={false}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* ── STEP 1: Setup Agent ── */}
        {currentStep === 1 && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-8">
            <h2 className="text-white text-xl font-semibold mb-2">
              Setup the NetSight Agent
            </h2>
            <p className="text-gray-400 mb-8">
              The NetSight Agent runs on a machine inside your local network. Download it,
              enter the configuration below, and it will scan your network automatically.
            </p>

            <div className="space-y-6 max-w-2xl">
              {/* Agent Key Section */}
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-5 h-5 text-[#d4af37]" />
                  <h3 className="text-white font-semibold">Your Agent Key</h3>
                </div>
                <p className="text-gray-500 text-sm mb-3">
                  Copy this key and paste it into the agent's Settings page.
                </p>
                {generatingKey ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating your agent key...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-[#d4af37] font-mono text-xs break-all select-all">
                      {agentKey || "Failed to generate — click Regenerate"}
                    </code>
                    <button
                      onClick={() => copyToClipboard(agentKey, "key")}
                      disabled={!agentKey}
                      className="px-4 py-3 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors font-medium flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
                    >
                      {copiedKey ? (
                        <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy</>
                      )}
                    </button>
                  </div>
                )}
                {!agentKey && !generatingKey && (
                  <button
                    onClick={generateAgentKey}
                    className="mt-2 text-sm text-[#d4af37] hover:text-[#f59e0b] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate Key
                  </button>
                )}
              </div>

              {/* Server URL */}
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5">
                <h3 className="text-white font-semibold mb-2">Server URL</h3>
                <p className="text-gray-500 text-sm mb-3">
                  Copy this URL and paste it into the agent's Settings page.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-green-400 font-mono text-sm select-all">
                    {serverUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(serverUrl, "url")}
                    className="px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg hover:border-[#d4af37] transition-colors font-medium flex items-center gap-2 flex-shrink-0"
                  >
                    {copiedUrl ? (
                      <><CheckCircle2 className="w-4 h-4 text-green-400" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              {/* Download Section */}
              <div className="bg-[#0a0a0a] border border-[#d4af37]/20 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-5 h-5 text-[#d4af37]" />
                  <h3 className="text-white font-semibold">Download the Agent</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <a
                    href="/downloads/netsight-agent.exe"
                    download="NetSight-Agent.exe"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors text-sm font-medium"
                  >
                    🪟 Windows (.exe)
                  </a>
                  <button disabled className="opacity-50 cursor-not-allowed flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-500 text-sm font-medium">
                    🐧 Linux (Soon)
                  </button>
                  <button disabled className="opacity-50 cursor-not-allowed flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-500 text-sm font-medium">
                    🍎 macOS (Soon)
                  </button>
                </div>
                <p className="text-gray-500 text-xs">
                  Or run manually: <code className="text-gray-400">cd agent && npm install && npm start</code> → opens at <code className="text-gray-400">http://localhost:9090</code>
                </p>
              </div>

              {/* Quick Setup Steps */}
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5">
                <h3 className="text-white font-semibold mb-4">Quick Setup</h3>
                <div className="space-y-3">
                  {[
                    { n: "1", text: "Download and run the agent on any machine inside your local network" },
                    { n: "2", text: "Open the agent at http://localhost:9090 → click Settings" },
                    { n: "3", text: "Paste the Server URL and Agent Key from above → click Save & Apply" },
                    { n: "4", text: "Click 'Restart All' — the agent will scan your network and send devices here automatically" },
                  ].map((step) => (
                    <div key={step.n} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 text-[#d4af37] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {step.n}
                      </div>
                      <span className="text-gray-300 text-sm">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waiting for Agent */}
              <div className={`p-5 rounded-lg border transition-all ${agentScanned ? "bg-green-500/10 border-green-500/30" :
                agentConnected ? "bg-[#d4af37]/10 border-[#d4af37]/30" :
                  waitingForAgent ? "bg-[#0a0a0a] border-[#2a2a2a]" :
                    "bg-[#d4af37]/5 border-[#d4af37]/20"
                }`}>
                {!waitingForAgent && !agentScanned && (
                  <p className="text-sm text-[#d4af37]">
                    <strong>Ready?</strong> Once you've configured the agent, click the button below.
                    This page will automatically detect when the agent finishes scanning.
                  </p>
                )}
                {waitingForAgent && !agentConnected && !agentScanned && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#d4af37] animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">Waiting for agent to connect...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Make sure the agent is running and configured with the key above. Checking every 5s... ({pollCount} checks)
                      </p>
                    </div>
                  </div>
                )}
                {waitingForAgent && agentConnected && !agentScanned && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#d4af37] animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">✓ Agent connected! Waiting for network scan to complete...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        The agent is scanning your network. This usually takes 15-30 seconds.
                      </p>
                    </div>
                  </div>
                )}
                {agentScanned && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">✓ Network scan complete! {devices.length} devices found.</p>
                      <p className="text-xs text-gray-500 mt-1">Moving to verification...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    // Skip setup
                    const ud = localStorage.getItem("user");
                    if (ud) {
                      const parsed = JSON.parse(ud);
                      parsed.user = { ...parsed.user, setupCompleted: true };
                      localStorage.setItem("user", JSON.stringify(parsed));
                    }
                    fetch(`${API_BASE}/devices/setup`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({ devices: [] }),
                    });
                    navigate("/app");
                  }}
                  className="px-6 py-2.5 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors font-medium flex items-center gap-2"
                >
                  Skip for now
                  <ExternalLink className="w-4 h-4" />
                </button>
                {!waitingForAgent ? (
                  <button
                    onClick={() => {
                      setWaitingForAgent(true);
                      setPollCount(0);
                      checkForAgentDevices(); // Immediate check
                    }}
                    className="px-6 py-2.5 bg-[#d4af37] text-white rounded-lg hover:bg-[#f59e0b] transition-colors font-medium flex items-center gap-2"
                  >
                    I've configured the agent — detect my devices
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Manual advance if they want to skip waiting
                      setCurrentStep(2);
                      setWaitingForAgent(false);
                    }}
                    className="px-6 py-2.5 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors font-medium flex items-center gap-2"
                  >
                    Skip waiting — continue manually
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Verify Devices ── */}
        {currentStep === 2 && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white text-xl font-semibold">
                Discovered Devices
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400">
                  {activeDevices.length} active
                </span>
                {excludedCount > 0 && (
                  <span className="text-gray-500">
                    {excludedCount} excluded
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-400 mb-8">
              {devices.length > 0
                ? "These devices were discovered by the agent on your network. Review them, rename, or exclude any you don't want to monitor."
                : "No devices found yet. Make sure the agent has completed a scan, or go back and configure it."
              }
            </p>

            {devices.length === 0 ? (
              <div className="text-center py-12">
                <Monitor className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No devices discovered yet</p>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2.5 bg-[#d4af37] text-white rounded-lg hover:bg-[#f59e0b] transition-colors font-medium"
                >
                  Go back and set up the agent
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {devices.map((device, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-all ${device.excluded
                        ? "border-[#2a2a2a] bg-[#0a0a0a] opacity-50"
                        : "border-[#2a2a2a] bg-[#0a0a0a]/50 hover:border-[#3a3a3a]"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${device.excluded
                            ? "bg-[#1a1a1a] text-gray-600"
                            : `bg-[#1a1a1a] ${deviceColors[device.type] || "text-gray-400"}`
                            }`}
                        >
                          {deviceIcons[device.type] || <Monitor className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {editingDevice === index ? (
                              <input
                                type="text"
                                value={device.name}
                                onChange={(e) => handleDeviceNameChange(index, e.target.value)}
                                onBlur={() => setEditingDevice(null)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingDevice(null)}
                                autoFocus
                                className="px-2 py-1 bg-[#1a1a1a] border border-[#d4af37] text-white rounded text-sm focus:outline-none w-48"
                                placeholder="Enter device name..."
                              />
                            ) : (
                              <>
                                <span className="text-sm font-medium text-white">
                                  {device.name || device.hostname || device.type}
                                </span>
                                {device.isGateway && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-semibold uppercase">
                                    Gateway
                                  </span>
                                )}
                                {!device.excluded && (
                                  <button
                                    onClick={() => setEditingDevice(index)}
                                    className="text-gray-500 hover:text-[#d4af37] transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{device.ip}</span>
                            <span className="font-mono">{device.mac}</span>
                            <span>{device.vendor}</span>
                          </div>
                          {device.openPorts && device.openPorts.length > 0 && !device.excluded && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {device.openPorts.map((p) => (
                                <span
                                  key={p.port}
                                  className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded text-[10px]"
                                >
                                  {p.service}:{p.port}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="hidden md:block">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${device.excluded ? "bg-[#1a1a1a] text-gray-600" : "bg-[#1a1a1a] text-gray-300"
                            }`}>
                            {device.type}
                          </span>
                        </div>

                        <div className="hidden md:flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${device.excluded ? "bg-gray-600" : "bg-green-500"}`} />
                          <span className={`text-xs ${device.excluded ? "text-gray-600" : "text-green-400"}`}>
                            {device.status}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExclude(index)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${device.excluded
                            ? "bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20"
                            : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            }`}
                        >
                          {device.excluded ? "Include" : "Exclude"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2.5 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors font-medium flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 bg-[#d4af37] text-white rounded-lg hover:bg-[#f59e0b] transition-colors font-medium flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Confirm & Finish ── */}
        {currentStep === 3 && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-8">
            <h2 className="text-white text-xl font-semibold mb-2">
              Setup Summary
            </h2>
            <p className="text-gray-400 mb-8">
              Review and confirm your network configuration
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5 text-center">
                <div className="text-3xl font-semibold text-[#d4af37] mb-1">
                  {activeDevices.length}
                </div>
                <div className="text-sm text-gray-400">Devices to Monitor</div>
              </div>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5 text-center">
                <div className="text-3xl font-semibold text-green-400 mb-1">
                  {activeDevices.filter((d) => d.status === "Online").length}
                </div>
                <div className="text-sm text-gray-400">Online</div>
              </div>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-5 text-center">
                <div className="text-3xl font-semibold text-blue-400 mb-1">
                  {new Set(activeDevices.map((d) => d.type)).size}
                </div>
                <div className="text-sm text-gray-400">Device Types</div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-[#2a2a2a]">
                <span className="text-sm font-medium text-gray-300">
                  Devices to be monitored
                </span>
              </div>
              <div className="divide-y divide-[#2a2a2a]">
                {activeDevices.map((device, index) => (
                  <div key={index} className="px-4 py-3 flex items-center gap-3">
                    <span className={deviceColors[device.type] || "text-gray-400"}>
                      {deviceIcons[device.type] || <Monitor className="w-4 h-4" />}
                    </span>
                    <span className="text-sm text-white flex-1">
                      {device.name || device.type}
                    </span>
                    <span className="text-xs text-gray-500">{device.ip}</span>
                    <span className="text-xs text-gray-600">{device.vendor}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-lg mb-8">
              <p className="text-sm text-[#d4af37]">
                <strong>Ready to go!</strong> The agent will continue monitoring these devices
                in the background. All dashboard features, topology maps, alerts, and
                analytics will work based on the agent's data feed.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCompleteSetup}
                disabled={saving}
                className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${completed
          ? "bg-[#d4af37] text-white"
          : active
            ? "bg-[#d4af37]/20 text-[#d4af37] border-2 border-[#d4af37]"
            : "bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a]"
          }`}
      >
        {completed ? <Check className="w-5 h-5" /> : number}
      </div>
      <div>
        <div
          className={`text-sm font-medium ${active || completed ? "text-white" : "text-gray-500"
            }`}
        >
          Step {number}
        </div>
        <div
          className={`text-xs ${active ? "text-[#d4af37]" : "text-gray-600"
            }`}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
