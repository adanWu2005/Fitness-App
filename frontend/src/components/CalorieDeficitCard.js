import React, { useState, useEffect } from 'react';

const CalorieDeficitCard = ({ caloriesBurned, loading, caloriesConsumed = 0, dailyGoal = 500, onClick }) => {
  // caloriesConsumed is now passed as a prop
  const deficitLoading = false;

  const calculateDeficit = () => {
    return caloriesBurned - caloriesConsumed;
  };

  const deficit = calculateDeficit();
  const isDeficit = deficit > 0;
  const isSurplus = deficit < 0;
  const isBalanced = deficit === 0;
  
  // Calculate calories needed to achieve the daily deficit goal
  const caloriesNeededForGoal = () => {
    // Always show the difference, even if within 200
    if (deficit < dailyGoal) {
      return dailyGoal - deficit;
    } else if (deficit > dailyGoal) {
      return deficit - dailyGoal;
    } else {
      return 0;
    }
  };

  const caloriesNeeded = caloriesNeededForGoal();
  
  // Calculate progress towards daily deficit goal (for progress bar)
  const deficitProgress = Math.max(0, Math.min((deficit / dailyGoal) * 100, 100));

  const getDeficitStatus = () => {
    if (Math.abs(deficit - dailyGoal) <= 200) return 'Goal Achieved';
    if (isDeficit) return 'Deficit';
    if (isSurplus) return 'Surplus';
    return 'Balanced';
  };

  const isWithin50 = Math.abs(deficit - dailyGoal) <= 50;

  const getDeficitColor = () => {
    if (isWithin50) return '#43a047'; // Strong green for within 50
    if (Math.abs(deficit - dailyGoal) <= 200) return '#4CAF50'; // Green for goal achieved
    return '#f44336'; // Red for not achieved
  };

  const getDeficitIcon = () => {
    if (isDeficit) return '📉';
    if (isSurplus) return '📈';
    return '⚖️';
  };

  return (
    <div 
      className="card calorie-deficit-card clickable-card" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-header">
        <div className="card-icon">{getDeficitIcon()}</div>
        <h3>Calorie Deficit</h3>
        {onClick && <div className="card-hint">Click to view logs</div>}
      </div>
      
      <div className="card-content">
        <div className="main-stat">
          {loading || deficitLoading ? (
            <div className="stat-loading">---</div>
          ) : (
            <span 
              className="stat-number"
              style={{ color: getDeficitColor(), fontWeight: isWithin50 ? 'bold' : undefined }}
            >
              {deficit.toLocaleString()}
            </span>
          )}
        </div>
        
        <div className="deficit-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-label">Burned:</span>
            <span className="breakdown-value">{caloriesBurned.toLocaleString()}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Consumed:</span>
            <span className="breakdown-value">{caloriesConsumed.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill deficit-progress"
              style={{ width: `${deficitProgress}%`, backgroundColor: isWithin50 ? '#43a047' : undefined }}
            ></div>
          </div>
          <div className="progress-text">
            {caloriesNeeded === 0 ? (
              'Goal achieved (within 200 calories)! 🎉'
            ) : (
              `${caloriesNeeded.toLocaleString()} calories ${deficit < 0 ? 'to burn' : 'needed'} to reach goal`
            )}
          </div>
        </div>
        
        <div className="deficit-status">
          {!loading && !deficitLoading && (
            <div 
              className="status-badge"
              style={{ backgroundColor: getDeficitColor(), color: isWithin50 ? '#fff' : undefined, fontWeight: isWithin50 ? 'bold' : undefined }}
            >
              {getDeficitStatus()}
            </div>
          )}
        </div>
        
        <div className="card-footer">
          <div className="goal-text">
            Goal: {dailyGoal.toLocaleString()} calorie deficit
          </div>
          <div className="deficit-explanation">
            {isWithin50 ? (
              <span className="positive-message" style={{ color: '#43a047', fontWeight: 'bold' }}>
                Amazing! You are within 50 calories of your goal! 🎉
              </span>
            ) : (
              <>
                {Math.abs(deficit - dailyGoal) <= 200 && (
                  <span className="positive-message">
                    {deficit >= 0
                      ? <>
                          Good job! You are within 200 calories of your goal.
                          <span className="red-message"> You need to consume {Math.abs(dailyGoal - deficit).toLocaleString()} more calories to reach your goal. 🎉</span>
                        </>
                      : `Good job! You are within 200 calories of your goal, and are ${Math.abs(dailyGoal - deficit).toLocaleString()} calories away from your goal. 🎉`}
                  </span>
                )}
                {isSurplus && (
                  <span className="warning-message">
                    You're in a calorie surplus. Burn {caloriesNeeded.toLocaleString()} calories to reach your deficit goal.
                  </span>
                )}
                {isBalanced && (
                  <span className="balanced-message">
                    Perfect balance! Burn {caloriesNeeded.toLocaleString()} calories to reach your deficit goal.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalorieDeficitCard; 