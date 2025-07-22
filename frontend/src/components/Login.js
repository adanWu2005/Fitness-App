import React, { useState } from 'react';
import './Auth.css';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="auth-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Fitbit Sign In Button */}
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <button
            type="button"
            className="auth-button fitbit"
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const response = await fetch('http://localhost:3001/api/fitbit/auth/login-init', {
                  method: 'GET',
                });
                const data = await response.json();
                if (response.ok && data.authUrl) {
                  const popup = window.open(
                    data.authUrl,
                    'fitbit-auth',
                    'width=600,height=700,scrollbars=yes,resizable=yes'
                  );
                  const handleMessage = async (event) => {
                    if (event.origin !== window.location.origin) return;
                    if (event.data?.type === 'FITBIT_AUTH_SUCCESS') {
                      window.removeEventListener('message', handleMessage);
                      if (popup) popup.close();
                      // Exchange Fitbit tokens for app login
                      const fitbitData = event.data.fitbitData;
                      const loginResp = await fetch('http://localhost:3001/api/auth/fitbit-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          fitbitUserId: fitbitData.fitbitUserId,
                          tokens: fitbitData.tokens,
                          profile: fitbitData.profile
                        })
                      });
                      const loginData = await loginResp.json();
                      if (loginResp.ok) {
                        localStorage.setItem('authToken', loginData.token);
                        localStorage.setItem('user', JSON.stringify(loginData.user));
                        onLogin(loginData.user, loginData.token);
                      } else {
                        setError(loginData.error || 'Fitbit login failed');
                      }
                    }
                  };
                  window.addEventListener('message', handleMessage);
                } else {
                  setError(data.error || 'Failed to start Fitbit login');
                }
              } catch (err) {
                setError('Network error. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            style={{ background: '#4cc2c4', color: 'white', marginTop: 8 }}
          >
            {loading ? 'Connecting to Fitbit...' : 'Sign in with Fitbit'}
          </button>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button 
              type="button" 
              className="auth-link"
              onClick={onSwitchToRegister}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 