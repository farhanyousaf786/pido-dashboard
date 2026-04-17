import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStoredTheme, setTheme as persistTheme } from '../../core/theme/theme.js';

function Settings() {
  const [dark, setDark] = useState(() => getStoredTheme() === 'dark');

  return (
    <section className="page-shell admin-settings">
      <h1 className="page-shell__title">Settings</h1>
      <p className="page-shell__subtitle">Application preferences.</p>

      <div className="admin-settings__grid">
        <div className="admin-settings__card admin-settings__card--appearance">
          <h2 className="admin-settings__card-title">
            <Sun size={18} className="admin-settings__appearance-sun" />
            Appearance
          </h2>
          <div className="admin-settings__test-mode-row">
            <div className="admin-settings__test-mode-text">
              <div className="admin-settings__test-mode-title">
                <Moon size={18} className="admin-settings__test-mode-icon" aria-hidden />
                <span>Theme</span>
                <span className={`admin-settings__test-pill ${dark ? 'admin-settings__test-pill--on' : ''}`}>
                  {dark ? 'Dark' : 'Light'}
                </span>
              </div>
              <p className="admin-settings__test-mode-desc">
                Saved in this browser. Account options live under Admin Settings (header menu).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`admin-settings__switch ${dark ? 'admin-settings__switch--on' : ''}`}
              onClick={() => {
                const next = !dark;
                setDark(next);
                persistTheme(next ? 'dark' : 'light');
              }}
            >
              <span className="admin-settings__switch-knob" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Settings;
