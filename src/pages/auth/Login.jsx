import React, { useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';

function Login() {
  const { login, loading, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || loading;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-logo">P</div>
          <div>
            <h1 className="auth-title">Welcome to Pido Dashboard</h1>
            <p className="auth-subtitle">Sign in to continue</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-field__label">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-field__label">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={disabled}
          >
            {disabled ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
