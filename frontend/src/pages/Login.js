import React, { useRef, useState } from 'react';

const API = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '');
const demoEnabled = process.env.NODE_ENV !== 'production' && process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true' && Boolean(process.env.REACT_APP_DEMO_EMAIL && process.env.REACT_APP_DEMO_PASSWORD);

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const authRequest = useRef(false);
  const signIn = async (credentials) => {
    if (authRequest.current) return;
    authRequest.current = true;
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (!data.user || !data.token) throw new Error('Sign in returned an incomplete session. Try again.');
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      authRequest.current = false;
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    return signIn({ email, password });
  };
  const demoLogin = () => {
    if (!demoEnabled) { setError('Demo credentials are unavailable in this environment.'); return; }
    const credentials = { email: process.env.REACT_APP_DEMO_EMAIL, password: process.env.REACT_APP_DEMO_PASSWORD };
    setEmail(credentials.email);
    setPassword(credentials.password);
    return signIn(credentials);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="icon">🎪</div>
          <h1>AI Event Planner</h1>
          <p>Smart Event Management Platform</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button className="login-btn" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button type="button" className="auto-fill-btn" onClick={demoLogin} disabled={isLoading || !demoEnabled}>
          Log In as Demo
        </button>
        {!demoEnabled && <p role="status">Demo credentials are unavailable. Use your existing account to sign in.</p>}
      </div>
    </div>
  );
}
