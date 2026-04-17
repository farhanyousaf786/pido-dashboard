import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  Mail,
  Shield,
  LogOut,
  Save,
  FlaskConical,
  KeyRound,
  Send,
  Hash,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { getStoredTheme, setTheme as persistTheme } from '../../core/theme/theme.js';

function AdminSettings() {
  const {
    adminProfile,
    user,
    logout,
    updateAdminName,
    changeAdminPassword,
    sendAdminPasswordResetEmail,
    adminTestMode,
    setAdminTestMode,
    error,
    setError,
  } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const [appearanceDark, setAppearanceDark] = useState(() => getStoredTheme() === 'dark');

  const hasEmailPasswordProvider = useMemo(
    () => user?.providerData?.some((p) => p.providerId === 'password') ?? false,
    [user],
  );

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    const res = await changeAdminPassword(currentPassword, newPassword);
    setPasswordSaving(false);
    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated.');
    } else {
      setPasswordError(res.error || 'Could not update password.');
    }
  };

  const handleSendReset = async () => {
    setPasswordMessage(null);
    setPasswordError(null);
    setResetSending(true);
    const res = await sendAdminPasswordResetEmail();
    setResetSending(false);
    if (res.success) {
      setPasswordMessage(`Reset link sent to ${email || 'your email'}. Check your inbox.`);
    } else {
      setPasswordError(res.error || 'Could not send reset email.');
    }
  };

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
                <span
                  className={`admin-settings__test-pill ${appearanceDark ? 'admin-settings__test-pill--on' : ''}`}
                >
                  {appearanceDark ? 'Dark' : 'Light'}
                </span>
              </div>
              <p className="admin-settings__test-mode-desc">
                Dark mode uses muted backgrounds and light text. Preference is saved in this browser only.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={appearanceDark}
              aria-label={appearanceDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`admin-settings__switch ${appearanceDark ? 'admin-settings__switch--on' : ''}`}
              onClick={() => {
                const nextDark = !appearanceDark;
                setAppearanceDark(nextDark);
                persistTheme(nextDark ? 'dark' : 'light');
              }}
            >
              <span className="admin-settings__switch-knob" />
            </button>
          </div>
        </div>

        <div className="admin-settings__card admin-settings__card--profile">
          <h2 className="admin-settings__card-title">
            <User size={18} />
            Profile
          </h2>
          <form className="admin-settings__form admin-settings__form--profile" onSubmit={handleSaveName}>
            <div className="admin-settings__field-action-row">
              <label className="admin-settings__label admin-settings__label--grow">
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
                className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
                disabled={saving || (name.trim() === (adminProfile?.name || '').toString().trim())}
              >
                <Save size={16} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
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
            <div className="admin-settings__readonly-row admin-settings__readonly-row--full">
              <Hash size={16} className="admin-settings__readonly-icon" />
              <div className="admin-settings__readonly-stack">
                <div className="admin-settings__readonly-label">User ID</div>
                <div className="admin-settings__readonly-value monospace admin-settings__uid">
                  {adminProfile?.uid || user?.uid || '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-settings__test-mode">
            <div className="admin-settings__test-mode-row">
              <div className="admin-settings__test-mode-text">
                <div className="admin-settings__test-mode-title">
                  <FlaskConical size={18} className="admin-settings__test-mode-icon" aria-hidden />
                  <span>Test mode</span>
                  <span
                    className={`admin-settings__test-pill ${adminTestMode ? 'admin-settings__test-pill--on' : ''}`}
                  >
                    {adminTestMode ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="admin-settings__test-mode-desc">
                  Stored in this browser only. When off, test accounts are hidden where the dashboard supports it.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={adminTestMode}
                aria-label={adminTestMode ? 'Turn test mode off' : 'Turn test mode on'}
                className={`admin-settings__switch ${adminTestMode ? 'admin-settings__switch--on' : ''}`}
                onClick={() => setAdminTestMode(!adminTestMode)}
              >
                <span className="admin-settings__switch-knob" />
              </button>
            </div>
          </div>
        </div>

        <div className="admin-settings__card admin-settings__card--password">
          <h2 className="admin-settings__card-title">
            <KeyRound size={18} />
            Password
          </h2>
          <p className="admin-settings__hint admin-settings__hint--tight">
            Change your password here, or send yourself a reset link if you prefer to set a new password by email.
          </p>

          {(passwordMessage || passwordError) && (
            <div
              className={`admin-settings__inline-msg ${passwordError ? 'admin-settings__inline-msg--error' : 'admin-settings__inline-msg--ok'}`}
            >
              {passwordError || passwordMessage}
            </div>
          )}

          {hasEmailPasswordProvider ? (
            <form className="admin-settings__form admin-settings__form--password" onSubmit={handleChangePassword}>
              <label className="admin-settings__label">
                <span>Current password</span>
                <input
                  type="password"
                  className="admin-settings__input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="admin-settings__label">
                <span>New password</span>
                <input
                  type="password"
                  className="admin-settings__input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </label>
              <label className="admin-settings__label">
                <span>Confirm new password</span>
                <input
                  type="password"
                  className="admin-settings__input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </label>
              <div className="admin-settings__password-actions">
                <button
                  type="submit"
                  className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
                  disabled={
                    passwordSaving ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  <KeyRound size={16} />
                  {passwordSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          ) : (
            <p className="admin-settings__hint">
              This account is not using email/password sign-in (for example, a social login). Use “Send reset email” only
              if your Firebase user has an email/password provider enabled.
            </p>
          )}

          <div className="admin-settings__password-reset">
            <button
              type="button"
              className="admin-settings__btn admin-settings__btn--secondary"
              onClick={handleSendReset}
              disabled={resetSending || !email}
            >
              <Send size={16} />
              {resetSending ? 'Sending…' : 'Send password reset email'}
            </button>
            {!email && (
              <p className="admin-settings__hint admin-settings__hint--tight">No email address is available.</p>
            )}
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
