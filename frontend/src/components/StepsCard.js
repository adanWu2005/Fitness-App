import React from 'react';

const StepsCard = ({ steps, loading, dailyGoal = 10000, onClick }) => {
  const progressPercentage = Math.min((steps / dailyGoal) * 100, 100);
  
  return (
    <div 
      className="card steps-card clickable-card" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-header">
        <div className="card-icon">👟</div>
        <h3>Steps</h3>
        {onClick && <div className="card-hint">Click to view logs</div>}
      </div>
      
      <div className="card-content">
        <div className="main-stat">
          {loading ? (
            <div className="stat-loading">---</div>
          ) : (
            <span className="stat-number">{steps.toLocaleString()}</span>
          )}
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill steps-progress"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {Math.round(progressPercentage)}% of daily goal
          </div>
        </div>
        
        <div className="card-footer">
          <div className="goal-text">
            Goal: {dailyGoal.toLocaleString()} steps
          </div>
          <div className="remaining-text">
            {steps >= dailyGoal ? (
              <span className="goal-achieved">Goal achieved! 🎉</span>
            ) : (
              <span>{(dailyGoal - steps).toLocaleString()} steps remaining</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepsCard;