import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Workouts.css';

const WorkoutCard = () => {
  const navigate = useNavigate();

  return (
    <div className="card workout-card">
      <div className="card-header">
        <div className="card-icon">🏋️‍♂️</div>
        <h3>Workouts</h3>
      </div>
      <div className="card-content">
        <div className="main-stat">
          <span className="stat-number">Log your workouts!</span>
        </div>
        <button className="workout-btn" onClick={() => navigate('/workouts')}>
          Go to Workouts
        </button>
      </div>
    </div>
  );
};

export default WorkoutCard; 