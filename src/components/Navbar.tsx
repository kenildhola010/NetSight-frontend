import { Bell, Search, Moon, Sun, User, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const notifications = [
    { id: 1, title: 'Device Down', message: 'Router-01 is unresponsive', time: '2m ago', type: 'critical' },
    { id: 2, title: 'High Latency', message: 'Switch-03 latency above threshold', time: '15m ago', type: 'warning' },
    { id: 3, title: 'Scan Complete', message: 'Network scan finished successfully', time: '1h ago', type: 'info' },
  ];

  return (
    <header className="h-16 bg-surface-elevated border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search devices, alerts, logs..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-80 bg-surface-elevated border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-4 border-b border-border hover:bg-surface cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${notif.type === 'critical' ? 'bg-critical-500' :
                            notif.type === 'warning' ? 'bg-warning-500' :
                              'bg-primary-500'
                          }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">{notif.title}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{notif.message}</p>
                          <p className="text-xs text-text-tertiary mt-1">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border">
                  <button
                    onClick={() => {
                      navigate('/app/alerts');
                      setShowNotifications(false);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View all alerts
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-surface-elevated border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-sm text-text-primary">Admin User</p>
                  <p className="text-xs text-text-tertiary">admin@netsight.com</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/app/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-critical-600 hover:bg-surface transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
