import React, { useEffect, useState } from 'react';
import { User, Mail, Shield, LogOut, Save, FlaskConical } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';

function AdminSettings() {
  const {
    adminProfile,
    user,
    logout,
    updateAdminName,
    adminTestMode,
    setAdminTestMode,
    error,
    setError,
  } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    setName((adminProfile?.name || '').toString());
  }, [adminProfile?.name]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setSaveMessage(null);
    setError('');
    setSaving(true);
    const res = await updateAdminName(name);
    setSaving(false);
    if (res.success) {
      setSaveMessage('Name saved.');
    }
  };

  const handleLogout = async () => {
    setError('');
    await logout();
  };

  const email = adminProfile?.email || user?.email || '';

  return (
    <section className="page-shell admin-settings">
      <h1 className="page-shell__title">Admin Settings</h1>
      <p className="page-shell__subtitle">
        Your account details and session.
      </p>

      {(error || saveMessage) && (
        <div
          className={`admin-settings__banner ${error ? 'admin-settings__banner--error' : 'admin-settings__banner--ok'}`}
        >
          {error || saveMessage}
        </div>
      )}

      <div className="admin-settings__grid">
        <div className="admin-settings__card">
          <h2 className="admin-settings__card-title">
            <User size={18} />
            Profile
          </h2>
          <form className="admin-settings__form" onSubmit={handleSaveName}>
            <label className="admin-settings__label">
              <span>Display name</span>
              <input
                type="text"
                className="admin-settings__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
              />
            </label>
            <button
              type="submit"
              className="admin-settings__btn admin-settings__btn--primary"
              disabled={saving || (name.trim() === (adminProfile?.name || '').toString().trim())}
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </form>

          <div className="admin-settings__readonly">
            <div className="admin-settings__readonly-row">
              <Mail size={16} className="admin-settings__readonly-icon" />
              <div>
                <div className="admin-settings__readonly-label">Email</div>
                <div className="admin-settings__readonly-value">{email || '—'}</div>
              </div>
            </div>
            <div className="admin-settings__readonly-row">
              <Shield size={16} className="admin-settings__readonly-icon" />
              <div>
                <div className="admin-settings__readonly-label">Role</div>
                <div className="admin-settings__readonly-value">
                  {adminProfile?.role ? adminProfile.role : '—'}
                </div>
              </div>
            </div>
            <div className="admin-settings__readonly-row">
              <span className="admin-settings__readonly-label">User ID</span>
              <div className="admin-settings__readonly-value monospace admin-settings__uid">
                {adminProfile?.uid || user?.uid || '—'}
              </div>
            </div>
          </div>

          <div className="admin-settings__test-mode">
            <h2 className="admin-settings__card-title admin-settings__card-title--compact">
              <FlaskConical size={18} />
              Test mode
            </h2>
            {/* <p className="admin-settings__hint admin-settings__hint--tight">
              Stored in this browser only. Use <code className="admin-settings__code">useAuth().adminTestMode</code>{' '}
              when you wire dashboard behavior.
            </p> */}
            <div className="admin-settings__toggle-row">
              <span className="admin-settings__toggle-label">
                {adminTestMode ? 'On' : 'Off'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={adminTestMode}
                className={`admin-settings__switch ${adminTestMode ? 'admin-settings__switch--on' : ''}`}
                onClick={() => setAdminTestMode(!adminTestMode)}
              >
                <span className="admin-settings__switch-knob" />
              </button>
            </div>
          </div>
        </div>

        <div className="admin-settings__card admin-settings__card--session">
          <h2 className="admin-settings__card-title">
            <LogOut size={18} />
            Session
          </h2>
          <p className="admin-settings__hint">
            Sign out of the dashboard on this device.
          </p>
          <button
            type="button"
            className="admin-settings__btn admin-settings__btn--logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </div>
    </section>
  );
}

export default AdminSettings;
