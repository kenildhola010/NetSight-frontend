import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Network,
  LayoutDashboard,
  Router,
  BarChart3,
  TrendingUp,
  Bell,
  Users,
  Settings,
  FileText,
  Menu,
  X,
  Search,
  ChevronDown,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Eye,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState, useMemo } from "react";
import { hasPermission } from "../utils/permissions";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Retrieve user data from localStorage
  const userDataStr = localStorage.getItem("user");
  const user = useMemo(() => {
    if (!userDataStr) return null;
    try {
      const parsed = JSON.parse(userDataStr);
      return parsed.user;
    } catch {
      return null;
    }
  }, [userDataStr]);

  const navItems = [
    { path: "/app", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/app/topology", label: "Topology", icon: <GitBranch className="w-5 h-5" /> },
    { path: "/app/devices", label: "Devices", icon: <Router className="w-5 h-5" /> },
    { path: "/app/analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
    { path: "/app/prediction", label: "Prediction", icon: <TrendingUp className="w-5 h-5" /> },
    { path: "/app/alerts", label: "Alerts", icon: <Bell className="w-5 h-5" /> },
    { path: "/app/users", label: "Users", icon: <Users className="w-5 h-5" /> },
    { path: "/app/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
    { path: "/app/audit", label: "Audit Logs", icon: <FileText className="w-5 h-5" /> },
  ];

  // Filter nav items based on user role
  const filteredNavItems = useMemo(() => {
    if (!user?.role) return [];
    return navItems.filter(item => hasPermission(user.role, item.path));
  }, [user?.role, navItems]);

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="fixed inset-0 flex bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className={`bg-[#1a1a1a] border-r border-[#2a2a2a] flex-shrink-0 flex flex-col relative transition-all duration-300 h-screen overflow-hidden ${sidebarOpen ? (collapsed ? 'w-16' : 'w-64') : 'w-0'
        } lg:block ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}>
        {/* Logo */}
        <div className="h-16 shrink-0 border-b border-[#2a2a2a] flex items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#d4af37] to-[#f59e0b] rounded-lg flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">NetSight</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg hover:bg-[#0a0a0a] transition-colors text-gray-400 hover:text-[#d4af37] ${collapsed ? 'mx-auto' : ''}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 min-h-0">
          <div className="px-3 space-y-1">
            {filteredNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.path)
                  ? 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20'
                  : 'text-gray-400 hover:bg-[#242424] hover:text-gray-200'
                  } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile with Dropdown */}
        <div className="shrink-0 border-t border-[#2a2a2a] p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-3 w-full hover:bg-[#242424] rounded-lg p-2 transition-colors ${collapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 bg-gradient-to-br from-[#d4af37] to-[#f59e0b] rounded-full flex items-center justify-center text-white font-medium shrink-0">
                  {user ? getInitials(user.name) : "U"}
                </div>
                {!collapsed && (
                  <>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{user?.name || "User"}</div>
                      <div className="text-xs text-gray-500 capitalize flex items-center gap-1.5 uppercase font-bold tracking-tighter">
                        {user?.role === 'admin' && <Shield className="w-3 h-3 text-purple-500" />}
                        {user?.role === 'engineer' && <Users className="w-3 h-3 text-green-500" />}
                        {user?.role === 'viewer' && <Eye className="w-3 h-3 text-gray-400" />}
                        {user?.role || "Role"}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#1a1a1a] border-[#2a2a2a] text-white" side={collapsed ? "right" : "top"} align="end" sideOffset={10}>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#2a2a2a]" />
              {hasPermission(user?.role, '/app/settings') && (
                <DropdownMenuItem className="focus:bg-[#242424] focus:text-white cursor-pointer" onClick={() => navigate('/app/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-[#2a2a2a]" />
              <DropdownMenuItem
                className="focus:bg-red-500/10 focus:text-red-500 text-red-400 cursor-pointer"
                onSelect={() => setShowLogoutDialog(true)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 shrink-0 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden mr-4 p-2 hover:bg-[#242424] rounded-lg text-gray-400"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search devices, alerts, logs..."
                className="w-full pl-10 pr-4 py-2 bg-[#242424] border border-[#2a2a2a] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 hover:bg-[#242424] rounded-lg text-gray-400">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 border-2 border-[#1a1a1a] rounded-full" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-[#1a1a1a] border-[#2a2a2a] text-white p-0" align="end" sideOffset={10}>
                <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <span className="text-xs text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-full">2 New</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-4 border-b border-[#2a2a2a] hover:bg-[#242424] cursor-pointer transition-colors" onClick={() => navigate('/app/alerts')}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Device offline detected</p>
                        <p className="text-xs text-gray-400 mt-1 border-l-2 border-gray-600 pl-2">Network Router is unreachable</p>
                        <p className="text-xs text-gray-500 mt-2">Just now</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-b border-[#2a2a2a] hover:bg-[#242424] cursor-pointer transition-colors" onClick={() => navigate('/app/alerts')}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">High Latency Alert</p>
                        <p className="text-xs text-gray-400 mt-1 border-l-2 border-gray-600 pl-2">Gateway latency above configured threshold</p>
                        <p className="text-xs text-gray-500 mt-2">2 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className="p-3 text-center text-sm font-medium text-[#d4af37] hover:bg-[#242424] cursor-pointer transition-colors"
                  onClick={() => navigate('/app/alerts')}
                >
                  View all notifications
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0 min-h-0">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Are you sure you want to logout?</h3>
            <p className="text-gray-400 mb-6">You will be redirected to the login page.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#242424] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}