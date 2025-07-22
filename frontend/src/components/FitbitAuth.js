import React, { useState, useEffect } from 'react';
import './FitbitAuth.css';
import FitbitSetupGuide from './FitbitSetupGuide';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const FitbitAuth = ({ user, onFitbitConnected, onFitbitDisconnected }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    if (user && user.fitbitConnected) {
      setIsAuthenticated(true);
      fetchActivity();
    } else {
      setIsAuthenticated(false);
      setActivity(null);
    }
  }, [user]);

  useEffect(() => {
    // Listen for popup message
    const handleMessage = async (event) => {
      console.log('[FitbitAuth] 📨 Received message event:', event);
      console.log('[FitbitAuth] 🌐 event.origin:', event.origin);
      console.log('[FitbitAuth] 🏠 window.location.origin:', window.location.origin);
      console.log('[FitbitAuth] 📋 event.data:', event.data);
      console.log('[FitbitAuth] 🔍 event.data.type:', event.data?.type);
      
      // Filter out webpack messages and other non-relevant messages
      if (event.data?.type === 'webpackWarnings' || event.data?.type === 'webpackHotUpdate') {
        console.log('[FitbitAuth] 🚫 Ignoring webpack message:', event.data.type);
        return;
      }
      
      // Test origin matching
      const originMatch = event.origin === window.location.origin;
      console.log('[FitbitAuth] ✅ Origin match:', originMatch);
      
      // Test data type matching
      const dataTypeMatch = event.data && event.data.type === 'FITBIT_AUTH_SUCCESS';
      console.log('[FitbitAuth] ✅ Data type match:', dataTypeMatch);
      
      if (originMatch && dataTypeMatch) {
        console.log('[FitbitAuth] 🎉 SUCCESS: Received FITBIT_AUTH_SUCCESS message from popup');
        console.log('[FitbitAuth] 📋 Fitbit data:', event.data.fitbitData);
        
        // Connect Fitbit to current user
        await connectFitbitToUser(event.data.fitbitData);
      } else {
        console.log('[FitbitAuth] ❌ Message rejected:');
        if (!originMatch) {
          console.log('[FitbitAuth]   - Origin mismatch: expected', window.location.origin, 'got', event.origin);
        }
        if (!dataTypeMatch) {
          console.log('[FitbitAuth]   - Data type mismatch: expected FITBIT_AUTH_SUCCESS, got', event.data?.type);
        }
      }
    };
    
    console.log('[FitbitAuth] 🎧 Setting up message listener');
    console.log('[FitbitAuth] 🏠 Current origin:', window.location.origin);
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('[FitbitAuth] 🧹 Cleaning up message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const connectFitbitToUser = async (fitbitData) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('[FitbitAuth] No auth token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/fitbit/auth/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fitbitUserId: fitbitData.fitbitUserId,
          tokens: fitbitData.tokens,
          profile: fitbitData.profile
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[FitbitAuth] ✅ Fitbit connected successfully:', data);
        setIsAuthenticated(true);
        setError(null);
        if (onFitbitConnected) {
          onFitbitConnected(data.user);
        }
        // Fetch activity data
        const activityData = await fetchActivity();
        setActivity(activityData);
      } else {
        const errorData = await response.json();
        console.error('[FitbitAuth] ❌ Failed to connect Fitbit:', errorData);
        
        // Handle specific error cases
        if (errorData.error === 'This Fitbit account is already connected to another user') {
          setError({
            type: 'account_conflict',
            message: 'This Fitbit account is already connected to another user',
            details: errorData.details
          });
        } else {
          setError({
            type: 'general',
            message: errorData.error || 'Failed to connect Fitbit'
          });
        }
      }
    } catch (error) {
      console.error('[FitbitAuth] ❌ Error connecting Fitbit:', error);
      setError({
        type: 'network',
        message: 'Failed to connect Fitbit'
      });
    }
  };

  const fetchActivity = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/fitbit/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('[FitbitAuth] Error fetching activity:', error);
      return null;
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError({
          type: 'auth',
          message: 'Please log in first'
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/fitbit/auth/login`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        const popup = window.open(
          data.authUrl,
          'fitbit-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
          }
        }, 1000);
      } else {
        setError({
          type: 'general',
          message: data.error || 'Failed to start authentication'
        });
      }
    } catch (error) {
      setError({
        type: 'network',
        message: 'Failed to connect to authentication service'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError({
          type: 'auth',
          message: 'Please log in first'
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/fitbit/auth/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(false);
        setActivity(null);
        setError(null);
        if (onFitbitDisconnected) {
          onFitbitDisconnected(data.user);
        }
      } else {
        setError({
          type: 'general',
          message: 'Failed to disconnect Fitbit'
        });
      }
    } catch (error) {
      setError({
        type: 'network',
        message: 'Failed to disconnect Fitbit'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/fitbit/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const activityData = await fetchActivity();
        setActivity(activityData);
      }
    } catch (error) {
      console.error('[FitbitAuth] Error refreshing token:', error);
    }
  };

  const handleSetupGuideContinue = () => {
    setShowSetupGuide(false);
    handleLogin();
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <div className={`auth-error ${error.type}`}>
        <h4>Connection Error</h4>
        <p>{error.message}</p>
        
        {error.type === 'account_conflict' && error.details && (
          <div className="error-details">
            <p><strong>Existing User:</strong> {error.details.existingUser}</p>
            <p><strong>Current User:</strong> {error.details.currentUser}</p>
            <p><strong>Fitbit ID:</strong> {error.details.fitbitUserId}</p>
          </div>
        )}
        
        {error.type === 'account_conflict' && (
          <div className="error-solutions">
            <h5>Solutions:</h5>
            <ul>
              <li>Use a different Fitbit account for each user</li>
              <li>Create a new Fitbit account at <a href="https://www.fitbit.com" target="_blank" rel="noopener noreferrer">fitbit.com</a></li>
              <li>Contact the existing user to disconnect their Fitbit account</li>
            </ul>
            <button 
              className="setup-guide-button"
              onClick={() => setShowSetupGuide(true)}
            >
              Show Setup Guide
            </button>
          </div>
        )}
        
        <button onClick={() => setError(null)} className="dismiss-button">
          Dismiss
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fitbit-auth">
        <div className="auth-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (showSetupGuide) {
    return (
      <div className="fitbit-auth">
        <FitbitSetupGuide 
          onClose={() => setShowSetupGuide(false)}
          onContinue={handleSetupGuideContinue}
        />
      </div>
    );
  }

  return (
    <div className="fitbit-auth">
      {renderError()}
      
      {!isAuthenticated && (
        <div className="auth-login">
          <h3>Connect to Fitbit</h3>
          <p>To access your Fitbit data, you need to authorize this application with your own Fitbit account.</p>
          <div className="auth-info">
            <p><strong>Important:</strong> Each user must connect to their own unique Fitbit account.</p>
            <button 
              className="info-button"
              onClick={() => setShowSetupGuide(true)}
            >
              Need help setting up?
            </button>
          </div>
          <button onClick={handleLogin} className="btn-primary">
            Connect to Fitbit
          </button>
        </div>
      )}
      
      {isAuthenticated && user && (
        <div className="auth-success">
          <div className="user-info">
            <h3>Connected to Fitbit</h3>
            <p>Welcome, {user.fitbitProfile?.displayName || user.fitbitProfile?.fullName || 'Fitbit User'}!</p>
            {activity && (
              <div className="activity-summary">
                <p>Today's Activity:</p>
                <ul>
                  <li>Steps: {activity.steps || 0}</li>
                  <li>Calories: {activity.calories || 0}</li>
                </ul>
              </div>
            )}
          </div>
          <div className="auth-actions">
            <button onClick={refreshToken} className="btn-secondary">
              Refresh Data
            </button>
            <button onClick={handleLogout} className="btn-danger">
              Disconnect Fitbit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitbitAuth; 