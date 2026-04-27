import { useState, useEffect } from "react";
import {
  Network,
  X,
  Search,
  Loader2,
  Router,
  Server,
  Laptop,
  Wifi,
  Shield,
  Printer,
  Monitor,
  Check,
  Plus,
  AlertCircle
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
  isAlreadyAdded: boolean;
  selected: boolean;
}

interface NetworkInterface {
  name: string;
  ip: string;
  netmask: string;
  cidr: string;
  isVirtual: boolean;
}

import API_BASE from "../config/api";

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

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
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

export function DiscoveryModal({ isOpen, onClose, onAdded }: DiscoveryModalProps) {
  const [step, setStep] = useState(1); // 1: Config, 2: Scanning, 3: Results
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const [config, setConfig] = useState({
    interface: "",
    ipRange: "",
    scanMethod: "icmp",
  });

  useEffect(() => {
    if (isOpen) {
      fetchInterfaces();
      setStep(1);
      setError("");
    }
  }, [isOpen]);

  const fetchInterfaces = async () => {
    setLoadingInterfaces(true);
    try {
      const response = await fetch(`${API_BASE}/devices/interfaces`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.interfaces.length > 0) {
        setNetworkInterfaces(data.interfaces);
        const primary = data.interfaces.find((i: NetworkInterface) => !i.isVirtual) || data.interfaces[0];
        setConfig({
          interface: primary.name,
          ipRange: primary.cidr,
          scanMethod: "icmp",
        });
      }
    } catch (err) {
      console.error('Failed to fetch interfaces:', err);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const handleScan = async () => {
    setStep(2);
    setScanning(true);
    setError("");
    setScanProgress(0);

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + Math.random() * 5;
      });
    }, 800);

    try {
      const response = await fetch(`${API_BASE}/devices/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ipRange: config.ipRange,
          scanMethod: config.scanMethod,
        }),
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setScanProgress(100);

      if (!response.ok) {
        throw new Error(data.message || "Network scan failed");
      }

      const scannedDevices: ScannedDevice[] = data.devices.map((d: any) => ({
        ...d,
        name: d.hostname || d.name || "",
        selected: !d.isAlreadyAdded,
      }));

      setTimeout(() => {
        setDevices(scannedDevices);
        setScanning(false);
        setStep(3);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setScanning(false);
      setError(err.message || "Failed to scan network");
      setStep(1);
    }
  };

  const handleAddDevices = async () => {
    const selectedDevices = devices.filter(d => d.selected && !d.isAlreadyAdded);
    if (selectedDevices.length === 0) {
      onClose();
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`${API_BASE}/devices/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ devices: selectedDevices }),
      });

      if (response.ok) {
        onAdded();
        onClose();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to add devices");
      }
    } catch (err: any) {
      setError(err.message);
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 flex items-center justify-center">
              <Network className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Discover Devices</h2>
              <p className="text-sm text-gray-400">Scan your network for new hardware</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Network Interface</label>
                  {loadingInterfaces ? (
                    <div className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-500 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Detecting...
                    </div>
                  ) : (
                    <select
                      value={config.interface}
                      onChange={(e) => {
                        const selected = networkInterfaces.find(i => i.name === e.target.value);
                        setConfig({ ...config, interface: e.target.value, ipRange: selected?.cidr || config.ipRange });
                      }}
                      className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    >
                      {networkInterfaces.map(iface => (
                        <option key={iface.name} value={iface.name}>{iface.name} ({iface.ip})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">IP Range (CIDR)</label>
                  <input
                    type="text"
                    value={config.ipRange}
                    onChange={(e) => setConfig({ ...config, ipRange: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="192.168.1.0/24"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Scan Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['icmp', 'arp', 'tcp'].map(method => (
                    <button
                      key={method}
                      onClick={() => setConfig({ ...config, scanMethod: method })}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${config.scanMethod === method
                          ? "border-[#d4af37] bg-[#d4af37]/10 text-white"
                          : "border-[#2a2a2a] bg-[#0a0a0a] text-gray-400 hover:border-[#3a3a3a]"
                        }`}
                    >
                      {method.toUpperCase()} Scan
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-[#d4af37]/20 rounded-full" />
                <div
                  className="absolute inset-0 border-4 border-[#d4af37] rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: '2s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="w-8 h-8 text-[#d4af37]" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Scanning Network...</h3>
              <p className="text-gray-400 text-sm max-w-xs mb-8">
                {scanProgress < 40 ? "Polling active IP addresses..." : "Identifying device vendors and services..."}
              </p>
              <div className="w-full max-w-sm bg-[#0a0a0a] rounded-full h-2 mb-2">
                <div
                  className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{Math.round(scanProgress)}% Complete</span>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-400">
                  {devices.filter(d => !d.isAlreadyAdded).length} New Devices Found
                </span>
                <button
                  onClick={() => setDevices(devices.map(d => ({ ...d, selected: !d.isAlreadyAdded })))}
                  className="text-xs text-[#d4af37] hover:underline"
                >
                  Select All New
                </button>
              </div>
              {devices.map((device, idx) => (
                <div
                  key={idx}
                  onClick={() => !device.isAlreadyAdded && setDevices(devices.map((d, i) => i === idx ? { ...d, selected: !d.selected } : d))}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${device.isAlreadyAdded
                      ? "bg-[#0a0a0a]/30 border-[#2a2a2a] opacity-60"
                      : device.selected
                        ? "bg-[#d4af37]/5 border-[#d4af37]/40"
                        : "bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#3a3a3a]"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${deviceColors[device.type] || "text-gray-400"}`}>
                    {deviceIcons[device.type] || <Monitor className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{device.name || device.hostname || device.ip}</span>
                      {device.isAlreadyAdded && (
                        <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-500 rounded text-[10px] uppercase font-bold">Added</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>{device.ip}</span>
                      <span className="font-mono">{device.mac}</span>
                      <span>{device.vendor}</span>
                    </div>
                  </div>
                  {!device.isAlreadyAdded && (
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${device.selected ? "bg-[#d4af37] border-[#d4af37]" : "border-gray-700"
                      }`}>
                      {device.selected && <Check className="w-4 h-4 text-black" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2a2a] bg-[#0a0a0a]/50 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleScan}
                className="px-8 py-2 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#f59e0b] transition-all transform hover:scale-105"
              >
                Scan Network
              </button>
            </>
          ) : step === 3 ? (
            <>
              <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Back</button>
              <button
                onClick={handleAddDevices}
                disabled={adding || devices.filter(d => d.selected && !d.isAlreadyAdded).length === 0}
                className="px-8 py-2 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#f59e0b] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add {devices.filter(d => d.selected && !d.isAlreadyAdded).length} Devices
              </button>
            </>
          ) : (
            <div className="w-full text-center text-xs text-gray-600 italic">Scan in progress... please do not close this window.</div>
          )}
        </div>
      </div>
    </div>
  );
}
