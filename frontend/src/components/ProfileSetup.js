import React, { useState } from 'react';
import './ProfileSetup.css';
import { API_BASE_URL } from '../services/api';

const ProfileSetup = ({ user, onProfileComplete, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    height: user?.height || '',
    weight: user?.weight || '',
    gender: user?.gender || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncingFitbit, setSyncingFitbit] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear success message when user starts editing
    if (success) {
      setSuccess('');
    }
  };

  const syncFitbitData = async () => {
    if (!user?.fitbitConnected) {
      setError('Please connect your Fitbit account first');
      return;
    }

    setSyncingFitbit(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/fitbit/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const fitbitData = await response.json();
        setFormData(prev => ({
          ...prev,
          height: fitbitData.height || prev.height,
          weight: fitbitData.weight || prev.weight,
          gender: fitbitData.gender || prev.gender
        }));
        // Show success message
        setSuccess('Fitbit profile data synced successfully!');
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sync Fitbit profile data');
      }
    } catch (err) {
      setError('Network error while syncing Fitbit data. Please try again.');
      console.error('Error syncing Fitbit data:', err);
    } finally {
      setSyncingFitbit(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate required fields
    if (!formData.height || !formData.weight || !formData.gender) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        if (onUserUpdate) {
          onUserUpdate(updatedUser.user);
        }
        onProfileComplete(updatedUser.user);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Error updating profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-card">
        <div className="profile-setup-header">
          <h2>Complete Your Profile</h2>
          <p>Help us personalize your fitness goals by providing some basic information</p>
        </div>

        {error && (
          <div className="profile-setup-error">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="profile-setup-success">
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="form-group">
            <label htmlFor="height">Height (cm)</label>
            <input
              type="number"
              id="height"
              name="height"
              value={formData.height}
              onChange={handleChange}
              required
              min="100"
              max="250"
              placeholder="Enter your height in centimeters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="weight">Weight (kg)</label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              min="30"
              max="300"
              step="0.01"
              placeholder="Enter your weight in kilograms"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select your gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {user?.fitbitConnected && (
            <div className="fitbit-sync-section">
              <button 
                type="button"
                className="sync-fitbit-button"
                onClick={syncFitbitData}
                disabled={syncingFitbit}
              >
                {syncingFitbit ? 'Syncing...' : 'Sync from Fitbit'}
              </button>
              <p className="sync-note">
                Sync your height, weight, and gender from your Fitbit profile
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="profile-setup-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup; 