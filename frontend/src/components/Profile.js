import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculatePersonalizedGoals } from '../services/goalsService';
import './Profile.css';

const Profile = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    username: user?.displayName || '',
    height: user?.height || '',
    weight: user?.weight || '',
    gender: user?.gender || '',
    profilePicture: user?.profilePicture || null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [autoUpdateGoals, setAutoUpdateGoals] = useState(false);

  useEffect(() => {
    // Load user profile data
    if (user) {
      setProfile({
        username: user.displayName || '',
        height: user.height || '',
        weight: user.weight || '',
        gender: user.gender || '',
        profilePicture: user.profilePicture || null
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({
          ...prev,
          profilePicture: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProfile(prev => ({
      ...prev,
      profilePicture: null
    }));
  };

  const syncFitbitData = async () => {
    if (!user?.fitbitConnected) {
      setError('Please connect your Fitbit account first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/api/fitbit/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const fitbitData = await response.json();
        setProfile(prev => ({
          ...prev,
          height: fitbitData.height || prev.height,
          weight: fitbitData.weight || prev.weight,
          gender: fitbitData.gender || prev.gender
        }));
        setSuccess('Fitbit profile data synced successfully!');
      } else {
        setError('Failed to sync Fitbit profile data');
      }
    } catch (err) {
      setError('Error syncing Fitbit data');
      console.error('Error syncing Fitbit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      // Don't send username in the update since it's not editable
      const { username, ...profileData } = profile;
      const response = await fetch('http://localhost:3001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        if (onUserUpdate) {
          onUserUpdate(updatedUser.user);
        }
        setIsEditing(false);
        setSuccess('Profile updated successfully!');

        // Auto-update goals if checkbox is checked and we have the required data
        if (autoUpdateGoals && profile.height && profile.weight && profile.gender) {
          const newGoals = calculatePersonalizedGoals(
            profile.height,
            profile.weight,
            profile.gender,
            user?.age
          );
          localStorage.setItem('userGoals', JSON.stringify(newGoals));
          localStorage.setItem('goalsSource', 'auto'); // Mark as auto-calculated
          console.log('[Profile] Auto-updated goals based on profile changes:', newGoals);
        } else if (!autoUpdateGoals) {
          // If checkbox is unchecked, mark goals as manual to prevent auto-calculation
          const existingGoals = localStorage.getItem('userGoals');
          if (existingGoals) {
            localStorage.setItem('goalsSource', 'manual');
            console.log('[Profile] Goals marked as manual (checkbox unchecked)');
          }
        }
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

  const handleCancel = () => {
    setIsEditing(false);
    setProfile({
      username: user?.displayName || '',
      height: user?.height || '',
      weight: user?.weight || '',
      gender: user?.gender || '',
      profilePicture: user?.profilePicture || null
    });
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1>Profile Settings</h1>
      </div>

      <div className="profile-container">
        <div className="profile-card-large">
          <div className="profile-picture-section">
            <div className="profile-picture-large">
              {profile.profilePicture ? (
                <img 
                  src={profile.profilePicture} 
                  alt="Profile" 
                  className="profile-picture-img"
                />
              ) : (
                <div className="profile-picture-placeholder-large">
                  <span className="profile-icon-large">👤</span>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="profile-picture-upload">
                <label htmlFor="profile-picture-input" className="upload-button">
                  Change Photo
                </label>
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {profile.profilePicture && (
                  <button 
                    className="remove-photo-button"
                    onClick={handleRemovePhoto}
                    type="button"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="profile-info">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="profile-field">
              <label>Username:</label>
              <span className="profile-value">{profile.username || 'Not set'}</span>
            </div>

            <div className="profile-field">
              <label>Height (cm):</label>
              {isEditing ? (
                <input
                  type="number"
                  value={profile.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className="profile-input"
                  min="0"
                />
              ) : (
                <span className="profile-value">{profile.height || 'Not set'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Weight (kg):</label>
              {isEditing ? (
                <input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="profile-input"
                  min="0"
                  step="0.1"
                />
              ) : (
                <span className="profile-value">{profile.weight || 'Not set'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Gender:</label>
              {isEditing ? (
                <select
                  value={profile.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="profile-input"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <span className="profile-value">{profile.gender || 'Not set'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Account Created:</label>
              <span className="profile-value">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </span>
            </div>

            {isEditing && (
              <div className="profile-goals-option">
                <label className="goals-checkbox-label">
                  <input
                    type="checkbox"
                    checked={autoUpdateGoals}
                    onChange={(e) => setAutoUpdateGoals(e.target.checked)}
                    className="goals-checkbox"
                    disabled={!profile.height || !profile.weight || !profile.gender}
                  />
                  <span className="goals-checkbox-text">
                    Update daily goals based on profile changes
                    {(!profile.height || !profile.weight || !profile.gender) && (
                      <small className="goals-checkbox-note"> (Complete your profile to enable)</small>
                    )}
                  </span>
                </label>
              </div>
            )}

            {user?.fitbitConnected && (
              <div className="fitbit-sync-section">
                {profile.height || profile.weight || profile.gender ? (
                  <div className="fitbit-synced-info">
                    <p className="sync-success">✓ Profile data synced from Fitbit</p>
                    <p className="sync-note">
                      Your height, weight, and gender have been automatically synced from your Fitbit profile
                    </p>
                  </div>
                ) : (
                  <>
                    <button 
                      className="sync-fitbit-button"
                      onClick={syncFitbitData}
                      disabled={loading}
                    >
                      {loading ? 'Syncing...' : 'Sync from Fitbit'}
                    </button>
                    <p className="sync-note">
                      Sync your height, weight, and gender from your Fitbit profile
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="profile-actions">
              {!isEditing ? (
                <button 
                  className="edit-profile-button"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    className="save-profile-button"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    className="cancel-profile-button"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 