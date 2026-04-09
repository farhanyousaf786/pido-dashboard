import React from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import appLogo from '../../../assets/logo/appLogo.png';

function Header({ onToggleSidebar, onOpenAdminSettings }) {
  const { adminProfile } = useAuth();
  const displayName = adminProfile?.name || adminProfile?.email || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <button
          type="button"
          className="app-header__burger"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <img
          src={appLogo}
          alt=""
          className="app-header__logo"
          width={32}
          height={32}
        />
        <span className="app-header__title">Pido Dashboard</span>
      </div>
      <div className="app-header__actions">
        {displayName && (
          <button
            type="button"
            className="app-header__name-button"
            onClick={onOpenAdminSettings}
          >
            <span className="app-header__subtitle app-header__subtitle--right">
              {displayName}
            </span>
          </button>
        )}
        <button
          type="button"
          className="app-header__avatar"
          onClick={onOpenAdminSettings}
          aria-label="Open admin settings"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}

export default Header;
