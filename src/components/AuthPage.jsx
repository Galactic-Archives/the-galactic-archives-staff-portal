import React, { useState } from 'react';

export default function AuthPage({ onAuthSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isSignup ? '/auth/register' : '/auth/login';
      const payload = isSignup 
        ? { email, password } 
        : { email, password };

      if (isSignup && password !== passwordConfirm) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || `${isSignup ? 'Signup' : 'Login'} failed`);
      }

      const data = await response.json();
      onAuthSuccess({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-background)',
      padding: 'var(--space-16)',
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card__body">
          <h1 style={{ marginBottom: 'var(--space-24)', textAlign: 'center' }}>
            Galactic Archives
          </h1>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-20)', textAlign: 'center' }}>
            {isSignup ? 'Create Account' : 'Login'}
          </h2>

          {error && (
            <div className="alert alert--error" style={{ marginBottom: 'var(--space-16)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isSignup && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--full-width"
              disabled={loading}
              style={{ marginBottom: 'var(--space-16)' }}
            >
              {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Login')}
            </button>
          </form>

          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <p style={{ marginBottom: 'var(--space-8)' }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              className="btn btn--outline"
              onClick={() => setIsSignup(!isSignup)}
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
