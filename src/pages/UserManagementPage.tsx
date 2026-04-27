import { useState, useEffect, useCallback } from "react";
import { Search, Plus, MoreVertical, Shield, User, Eye, Loader2, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastActive?: string;
  createdAt: string;
}

import API_BASE from "../config/api";

function getAuthHeaders(): Record<string, string> {
  const userData = localStorage.getItem("user");
  if (!userData) return { "Content-Type": "application/json" };
  try {
    const parsed = JSON.parse(userData);
    const token = parsed?.token || parsed?.tokens?.accessToken;
    if (token) return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  } catch {
    // ignore
  }
  return { "Content-Type": "application/json" };
}

export function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddUser, setShowAddUser] = useState(false);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "viewer",
    password: ""
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setUsersList(data.users);
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess("User invited successfully!");
        setShowAddUser(false);
        setNewUser({ name: "", email: "", role: "viewer", password: "" });
        fetchUsers();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error(data.message || "Failed to add user");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setUsersList(prev => prev.map(u => u._id === id ? { ...u, isActive: !currentStatus } : u));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setUsersList(prev => prev.filter(u => u._id !== id));
        setSuccess("User deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = usersList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: usersList.length,
    admin: usersList.filter(u => u.role.toLowerCase() === "admin").length,
    engineer: usersList.filter(u => u.role.toLowerCase() === "user" || u.role.toLowerCase() === "engineer").length,
    viewer: usersList.filter(u => u.role.toLowerCase() === "viewer").length
  };

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-white mb-1">User & Role Management</h1>
          <p className="text-gray-400">Manage team members and their access permissions</p>
        </div>
        <button
          onClick={() => fetchUsers()}
          className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Refresh List"
        >
          <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400 animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3 text-green-400 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard label="Total Users" value={stats.total} icon={<User className="w-5 h-5 text-[#d4af37]" />} />
        <StatCard label="Admins" value={stats.admin} icon={<Shield className="w-5 h-5 text-purple-500" />} />
        <StatCard label="Engineers" value={stats.engineer} icon={<User className="w-5 h-5 text-green-500" />} />
        <StatCard label="Viewers" value={stats.viewer} icon={<Eye className="w-5 h-5 text-gray-400" />} />
      </div>

      {/* Role Permissions Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
        <h4 className="font-medium text-blue-400 mb-2">Role Permissions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-blue-300 mb-1">Admin</div>
            <div className="text-gray-400">Full system access, user management, settings configuration</div>
          </div>
          <div>
            <div className="font-medium text-blue-300 mb-1">Engineer</div>
            <div className="text-gray-400">Device management, alerts, analytics, no user management</div>
          </div>
          <div>
            <div className="font-medium text-blue-300 mb-1">Viewer</div>
            <div className="text-gray-400">Read-only access to dashboard, devices, and analytics</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Engineer">Engineer</option>
              <option value="Viewer">Viewer</option>
            </select>

            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden relative min-h-[400px]">
        {loading && usersList.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
              <span className="text-gray-400">Loading users...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a0a] border-b border-[#2a2a2a]">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      {searchQuery ? "No users match your search" : "No users found"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-[#0a0a0a]/50 transition-colors group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-[#d4af37] to-[#f59e0b] rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg shadow-yellow-500/10">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="text-sm font-medium text-white">{user.name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">{user.email}</td>
                      <td className="py-4 px-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={user.isActive ? "active" : "inactive"} onClick={() => handleToggleStatus(user._id, user.isActive)} />
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-500 hover:text-white transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddUser(false)}>
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAddUser}>
              <div className="p-6 border-b border-[#2a2a2a] flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Add New User</h2>
                  <p className="text-sm text-gray-400">Invite a team member to NetSight</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="p-1 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@acme.com"
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="engineer">Engineer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-[#0a0a0a]/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#d4af37] text-black rounded-lg hover:bg-[#f59e0b] disabled:opacity-50 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const normalizedRole = role.toLowerCase();
  const styles = {
    admin: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    engineer: "bg-green-500/10 text-green-500 border-green-500/30",
    user: "bg-green-500/10 text-green-500 border-green-500/30",
    viewer: "bg-gray-500/10 text-gray-400 border-gray-500/30"
  };

  const icons = {
    admin: <Shield className="w-3 h-3" />,
    engineer: <User className="w-3 h-3" />,
    user: <User className="w-3 h-3" />,
    viewer: <Eye className="w-3 h-3" />
  };

  const style = styles[normalizedRole as keyof typeof styles] || styles.viewer;
  const icon = icons[normalizedRole as keyof typeof icons] || icons.viewer;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${style}`}>
      {icon}
      {role}
    </span>
  );
}

function StatusBadge({ status, onClick }: { status: string; onClick?: () => void }) {
  if (status === "active") {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20 transition-colors"
      >
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        Active
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors"
    >
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
      Inactive
    </button>
  );
}