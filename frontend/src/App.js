import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import FitbitAuth from './components/FitbitAuth';
import Login from './components/Login';
import Register from './components/Register';

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Workouts from './components/Workouts';
import FolderWorkouts from './components/FolderWorkouts';
import WorkoutCard from './components/WorkoutCard';
import FoodRecognition from './components/FoodRecognition';
import Meals from './components/Meals';
import FolderMeals from './components/FolderMeals';
import Profile from './components/Profile';
import { API_BASE_URL } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [activity, setActivity] = useState(null);
  const [showAuth, setShowAuth] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on app load
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      const userData = JSON.parse(storedUser);
      setAuthToken(token);
      setUser(userData);
      

      
      // Verify token is still valid
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAuthToken(token);
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        setAuthToken(null);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      // Clear storage on error
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
    setShowAuth('login');
    
    // If user doesn't have Fitbit connected, show Fitbit auth
    if (!userData.fitbitConnected) {
      // The FitbitAuth component will handle the connection automatically
    }
  };

  const handleRegister = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
    setShowAuth('register');
    
    // After registration, automatically connect to Fitbit
    if (!userData.fitbitConnected) {
      // The FitbitAuth component will handle the connection automatically
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setAuthToken(null);
    setActivity(null);
    setShowAuth('login');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data including Fitbit connections.'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Clear local storage and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        setAuthToken(null);
        setActivity(null);
        setShowAuth('login');
        alert('Your account has been successfully deleted.');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete account: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  const handleFitbitConnected = (updatedUser) => {
    setUser(updatedUser);
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Fetch activity data when Fitbit is connected
    fetchActivityData();
  };

  const handleFitbitDisconnected = (updatedUser) => {
    setUser(updatedUser);
    setActivity(null);
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };



  // Function to fetch activity data
  const fetchActivityData = async () => {
    if (!user || !user.fitbitConnected) {
      console.log('[App] fetchActivityData: User not connected to Fitbit');
      return;
    }
    
    try {
      console.log('[App] fetchActivityData: Fetching activity data...');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/fitbit/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[App] fetchActivityData: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[App] fetchActivityData: Activity data received:', data);
        setActivity(data);
      } else {
        const errorData = await response.json();
        console.error('[App] fetchActivityData: Error response:', errorData);
        
        // Check if it's a token expiration error
        if (response.status === 401 && errorData.error && errorData.error.includes('expired')) {
          console.log('[App] fetchActivityData: Token expired, updating user connection status');
          // Update user to show as disconnected
          const updatedUser = { ...user, fitbitConnected: false };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('[App] fetchActivityData: Network error:', error);
    }
  };

  // Fetch activity data when user is connected to Fitbit
  useEffect(() => {
    if (user && user.fitbitConnected) {
      fetchActivityData();
    }
  }, [user?.fitbitConnected]);

  const switchToRegister = () => {
    setShowAuth('register');
  };

  const switchToLogin = () => {
    setShowAuth('login');
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication screens if user is not logged in
  if (!user || !authToken) {
    return (
      <div className="App">
        {showAuth === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
        ) : (
          <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
        )}
      </div>
    );
  }

  // Profile setup is no longer required - users go directly to dashboard

  // Main app with authenticated user
  return (
    <div className="App">
      <header className="App-header">
        <h1>Fitness Tracker</h1>
        <div className="user-info">
          <span>Welcome, {user.displayName}!</span>
          {user.fitbitConnected && (
            <span className="fitbit-status">
              ✓ Connected to Fitbit
            </span>
          )}
          <div className="user-actions">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
            <button onClick={handleDeleteAccount} className="delete-account-button">
              Delete Account
            </button>
          </div>
        </div>
      </header>
      
      <main>
        <Router>
          <Routes>
            <Route path="/food" element={<FoodRecognition user={user} />} />
            <Route path="/meals/:folderName" element={<FolderMeals user={user} />} />
            <Route path="/meals" element={<Meals user={user} />} />
            <Route path="/workouts/:folderName" element={<FolderWorkouts user={user} />} />
            <Route path="/workouts" element={<Workouts user={user} />} />
            <Route path="/profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />
            <Route path="/" element={
              <Dashboard user={user} activity={activity} />
            } />
          </Routes>
        </Router>
        
        {/* Show FitbitAuth component if user is not connected to Fitbit */}
        {!user.fitbitConnected && (
          <div className="fitbit-auth-container">
            <FitbitAuth 
              user={user}
              onFitbitConnected={handleFitbitConnected}
              onFitbitDisconnected={handleFitbitDisconnected}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;