import React from 'react';
import packageJson from '../../../package.json';
import {
  LayoutDashboard,
  Users,
  Gift,
  Settings,
  ShieldCheck,
  Bell,
  Calendar,
  ClipboardList,
  ShieldAlert,
  Mail,
  MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'verifications', label: 'Verifications', icon: ShieldCheck },
  { key: 'chatSafety', label: 'Chat Safety', icon: ShieldAlert },
  { key: 'superChat', label: 'Super Chat', icon: MessageSquare },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'bulkMessaging', label: 'Bulk Messaging', icon: Mail },
  { key: 'bookings', label: 'Bookings', icon: Calendar },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'forms', label: 'Forms', icon: ClipboardList },
  { key: 'appSettings', label: 'App Settings', icon: Settings },
  { key: 'referral', label: 'Referral', icon: Gift },
  { key: 'adminSettings', label: 'Admin Settings', icon: Settings },
];

function Sidebar({ activePage, onNavigate, isOpen }) {
  const sidebarClass = isOpen ? 'app-sidebar app-sidebar--open' : 'app-sidebar';

  return (
    <aside className={sidebarClass}>
      <nav className="app-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.key || (item.key === 'appSettings' && activePage === 'settings');
          const className = isActive
            ? 'app-sidebar__item app-sidebar__item--active'
            : 'app-sidebar__item';
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              className={className}
              onClick={() => onNavigate(item.key === 'appSettings' ? 'settings' : item.key)}
            >
              <Icon size={18} className="app-sidebar__icon" />
              <span className="app-sidebar__label">{item.label}</span>
              {item.key === 'dashboard' && (
                <span className="app-sidebar__badge" aria-label="Live" />
              )}
            </button>
          );
        })}
      </nav>
      <div
        className="app-sidebar__version"
        style={{
          marginTop: 'auto',
          padding: '1rem 0.5rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--color-dark-gray, #64748b)',
        }}
      >
        v{packageJson.version}
      </div>
    </aside>
  );
}

export default Sidebar;
