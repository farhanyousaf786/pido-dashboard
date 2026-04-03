import React from 'react';
import { LayoutDashboard, Users, Gift, Settings, ShieldCheck, Bell, Calendar } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'verifications', label: 'Verifications', icon: ShieldCheck },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'bookings', label: 'Bookings', icon: Calendar },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'referral', label: 'Referral', icon: Gift },
  { key: 'adminSettings', label: 'Admin Settings', icon: Settings },
];

function Sidebar({ activePage, onNavigate, isOpen }) {
  const sidebarClass = isOpen ? 'app-sidebar app-sidebar--open' : 'app-sidebar';

  return (
    <aside className={sidebarClass}>
      <nav className="app-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.key;
          const className = isActive
            ? 'app-sidebar__item app-sidebar__item--active'
            : 'app-sidebar__item';
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              className={className}
              onClick={() => onNavigate(item.key)}
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
    </aside>
  );
}

export default Sidebar;
