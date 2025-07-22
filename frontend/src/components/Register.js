import React, { useState } from 'react';
import './Auth.css';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://fitterjitter.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onRegister(data.user, data.token);
      } else {
        setError(data.error || 'Registration failed');
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
          <h2>Create Account</h2>
          <p>Join us to start tracking your fitness journey</p>
        </div>

        {error && (
          <div className="auth-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              required
              placeholder="Enter your display name"
            />
          </div>

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
              placeholder="Enter your password (min 6 characters)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Fitbit Register Button */}
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <button
            type="button"
            className="auth-button fitbit"
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const response = await fetch('https://fitterjitter.onrender.com/api/fitbit/auth/login-init', {
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
                      // Exchange Fitbit tokens for app registration
                      const fitbitData = event.data.fitbitData;
                      const regResp = await fetch('https://fitterjitter.onrender.com/api/auth/fitbit-register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          fitbitUserId: fitbitData.fitbitUserId,
                          tokens: fitbitData.tokens,
                          profile: fitbitData.profile
                        })
                      });
                      const regData = await regResp.json();
                      if (regResp.ok) {
                        localStorage.setItem('authToken', regData.token);
                        localStorage.setItem('user', JSON.stringify(regData.user));
                        onRegister(regData.user, regData.token);
                      } else {
                        setError(regData.error || 'Fitbit registration failed');
                      }
                    }
                  };
                  window.addEventListener('message', handleMessage);
                } else {
                  setError(data.error || 'Failed to start Fitbit registration');
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
            {loading ? 'Connecting to Fitbit...' : 'Register with Fitbit'}
          </button>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              className="auth-link"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 