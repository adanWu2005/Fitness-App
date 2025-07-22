import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileCard.css';

const ProfileCard = ({ user }) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="profile-card" onClick={handleProfileClick}>
      <div className="profile-picture-container">
        {user?.profilePicture ? (
          <img 
            src={user.profilePicture} 
            alt="Profile" 
            className="profile-picture"
          />
        ) : (
          <div className="profile-picture-placeholder">
            <span className="profile-icon">👤</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard; 