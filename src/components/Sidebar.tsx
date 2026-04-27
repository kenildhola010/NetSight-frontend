import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  BarChart3,
  TrendingUp,
  Bell,
  Users,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Devices', href: '/app/devices', icon: Network },
  { name: 'Analytics', href: '/app/analytics', icon: BarChart3 },
  { name: 'Predictions', href: '/app/prediction', icon: TrendingUp },
  { name: 'Alerts', href: '/app/alerts', icon: Bell },
  { name: 'Users', href: '/app/users', icon: Users },
  { name: 'Settings', href: '/app/settings', icon: Settings },
  { name: 'Audit Logs', href: '/app/audit', icon: FileText },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'
        } bg-[#1a1a1a] border-r border-[#2a2a2a] transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#2a2a2a]">
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
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/app'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                ? 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20'
                : 'text-gray-400 hover:bg-[#0a0a0a] hover:text-[#d4af37]'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#2a2a2a]">
          <div className="text-xs text-gray-500">
            Version 2.1.0
          </div>
        </div>
      )}
    </aside>
  );
}