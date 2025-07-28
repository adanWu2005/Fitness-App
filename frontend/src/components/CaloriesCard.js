import React from 'react';

const CaloriesCard = ({ calories, loading, dailyGoal = 2000, onClick }) => {
  const progressPercentage = Math.min((calories / dailyGoal) * 100, 100);
  
  return (
    <div 
      className="card calories-card clickable-card" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-header">
        <div className="card-icon">🔥</div>
        <h3>Calories Burned</h3>
        {onClick && <div className="card-hint">Click to view logs</div>}
      </div>
      
      <div className="card-content">
        <div className="main-stat">
          {loading ? (
            <div className="stat-loading">---</div>
          ) : (
            <span className="stat-number">{calories.toLocaleString()}</span>
          )}
        </div>
        
        <div className="calories-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-label">Today's Activity:</span>
            <span className="breakdown-value">{calories.toLocaleString()}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Daily Goal:</span>
            <span className="breakdown-value">{dailyGoal.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill calories-progress"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {Math.round(progressPercentage)}% of daily goal
          </div>
        </div>
        
        <div className="card-footer">
          <div className="goal-text">
            Goal: {dailyGoal.toLocaleString()} calories
          </div>
          <div className="remaining-text">
            {calories >= dailyGoal ? (
              <span className="goal-achieved">Goal achieved! 🎉</span>
            ) : (
              <span>{(dailyGoal - calories).toLocaleString()} calories remaining</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaloriesCard;