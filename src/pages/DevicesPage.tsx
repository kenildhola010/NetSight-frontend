import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Router,
  Server,
  Laptop,
  Smartphone,
  Printer,
  Network as NetworkIcon,
  ChevronDown,
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

import API_BASE from "../config/api";

interface Device {
  id: string;
  name: string;
  ip: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  lastSeen: string;
  osInfo: string;
  deviceCategory: string;
  vendor: string;
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

export function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserRole(parsed?.user?.role?.toLowerCase() || "");
      } catch (e) {
        console.error("Error parsing user data");
      }
    }
  }, []);

  const isViewer = userRole === 'viewer';

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/monitoring/devices`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        const mappedDevices: Device[] = data.devices.map((d: any) => {
          // Map status
          let status: 'healthy' | 'warning' | 'critical' = 'healthy';
          if (d.status === 'Offline') status = 'critical';
          else if (d.latency > 100 || d.packetLoss > 1) status = 'warning';

          // Format uptime
          const uptime = d.uptime ? `${Math.floor(d.uptime / 3600)}h ${Math.floor((d.uptime % 3600) / 60)}m` : "0m";

          // Format last seen
          const lastSeenDate = new Date(d.lastSeen);
          const now = new Date();
          const diffSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);
          let lastSeen = "Just now";
          if (diffSeconds > 60) lastSeen = `${Math.floor(diffSeconds / 60)} min ago`;
          if (diffSeconds > 3600) lastSeen = `${Math.floor(diffSeconds / 3600)} hour ago`;

          return {
            id: d._id,
            name: d.name || d.hostname || d.ip,
            ip: d.ip,
            type: d.type || "Device",
            status,
            uptime,
            lastSeen,
            osInfo: d.osInfo || '',
            deviceCategory: d.deviceCategory || '',
            vendor: d.vendor || 'Unknown',
          };
        });
        setDevices(mappedDevices);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async () => {
    if (!deviceToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/devices/${deviceToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setDevices(prev => prev.filter(d => d.id !== deviceToDelete.id));
        setDeviceToDelete(null);
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

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ip.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || device.status === statusFilter;
    const matchesType = typeFilter === "all" || device.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white mb-1">Devices</h1>
        <p className="text-gray-400">Manage and monitor all network devices</p>
      </div>

      {/* Toolbar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or IP address..."
                className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
            >
              <option value="all">All Types</option>
              <option value="Router">Router</option>
              <option value="Switch">Switch</option>
              <option value="Server">Server</option>
              <option value="Workstation">Workstation</option>
              <option value="Access Point">Access Point</option>
              <option value="Printer">Printer</option>
              <option value="Mobile">Mobile</option>
              <option value="IoT">IoT</option>
            </select>

            <button className="px-4 py-2 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#0a0a0a] transition-colors flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>


          </div>
        </div>
      </div>



      {/* Devices Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Device</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">OS</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Uptime</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Seen</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading devices...</p>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-500">
                    No devices found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => navigate(`/app/devices/${device.id}`)}
                    className="border-b border-[#2a2a2a] hover:bg-[#0a0a0a]/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(device.type)}
                        <div>
                          <div className="text-sm font-medium text-white">{device.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[100px]">{device.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400 font-mono">{device.ip}</td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-white">{device.type}</span>
                      {device.deviceCategory && device.deviceCategory !== 'Unknown' && device.deviceCategory !== device.type && (
                        <span className="text-xs text-gray-500 ml-1">({device.deviceCategory})</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {device.osInfo && device.osInfo !== 'Unknown' ? (
                        <div>
                          <span className="text-sm text-white">{device.osInfo}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={device.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{device.uptime}</td>
                    <td className="py-3 px-4 text-sm text-gray-400">{device.lastSeen}</td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="p-1 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/devices/${device.id}`);
                            }}
                            className="cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>

                          {!isViewer && (
                            <>
                              <DropdownMenuSeparator className="bg-[#2a2a2a]" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeviceToDelete(device);
                                }}
                                className="text-red-400 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Device
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {filteredDevices.length} of {devices.length} devices
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-[#2a2a2a] text-gray-400 rounded text-sm hover:bg-[#0a0a0a]">
              Previous
            </button>
            <button className="px-3 py-1 bg-[#d4af37] text-black rounded text-sm font-medium">
              1
            </button>
            <button className="px-3 py-1 border border-[#2a2a2a] text-gray-400 rounded text-sm hover:bg-[#0a0a0a]">
              2
            </button>
            <button className="px-3 py-1 border border-[#2a2a2a] text-gray-400 rounded text-sm hover:bg-[#0a0a0a]">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deviceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Are you absolutely sure?</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                This will permanently delete <strong className="text-white">{deviceToDelete?.name}</strong> ({deviceToDelete?.ip}) and remove all its historical performance data. This action cannot be undone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setDeviceToDelete(null)}
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
  );
}

function getDeviceIcon(type: string) {
  const iconClass = "w-9 h-9 rounded-lg flex items-center justify-center";

  switch (type) {
    case "Router":
      return (
        <div className={`${iconClass} bg-[#d4af37]/10 border border-[#d4af37]/20`}>
          <Router className="w-5 h-5 text-[#d4af37]" />
        </div>
      );
    case "Switch":
      return (
        <div className={`${iconClass} bg-blue-500/10 border border-blue-500/20`}>
          <NetworkIcon className="w-5 h-5 text-blue-500" />
        </div>
      );
    case "Server":
      return (
        <div className={`${iconClass} bg-green-500/10 border border-green-500/20`}>
          <Server className="w-5 h-5 text-green-500" />
        </div>
      );
    case "Workstation":
      return (
        <div className={`${iconClass} bg-purple-500/10 border border-purple-500/20`}>
          <Laptop className="w-5 h-5 text-purple-500" />
        </div>
      );
    case "Access Point":
      return (
        <div className={`${iconClass} bg-amber-500/10 border border-amber-500/20`}>
          <NetworkIcon className="w-5 h-5 text-amber-500" />
        </div>
      );
    case "Printer":
      return (
        <div className={`${iconClass} bg-gray-500/10 border border-gray-500/20`}>
          <Printer className="w-5 h-5 text-gray-400" />
        </div>
      );
    case "Mobile":
      return (
        <div className={`${iconClass} bg-pink-500/10 border border-pink-500/20`}>
          <Smartphone className="w-5 h-5 text-pink-500" />
        </div>
      );
    case "IoT":
      return (
        <div className={`${iconClass} bg-cyan-500/10 border border-cyan-500/20`}>
          <NetworkIcon className="w-5 h-5 text-cyan-500" />
        </div>
      );
    default:
      return (
        <div className={`${iconClass} bg-gray-500/10 border border-gray-500/20`}>
          <Laptop className="w-5 h-5 text-gray-400" />
        </div>
      );
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    healthy: "bg-green-500/10 text-green-500 border-green-500/30",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    critical: "bg-red-500/10 text-red-500 border-red-500/30"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-green-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
        }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}