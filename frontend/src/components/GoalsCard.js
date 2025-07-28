import React, { useState, useEffect } from 'react';
import { calculatePersonalizedGoals, getCalculationDetails } from '../services/goalsService';
import { updateUserProfile, updateGoalCompletion } from '../services/api';

const GoalsCard = ({ calculatedGoals, onGoalsChange, user }) => {
  const defaultGoals = {
    dailyCaloriesConsumed: 2000,
    dailyCalorieDeficit: 500
  };
  
  const [goals, setGoals] = useState(calculatedGoals || defaultGoals);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState(calculatedGoals || defaultGoals);
  const [calculationDetails, setCalculationDetails] = useState(null);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

  // Update goals when calculatedGoals prop changes
  useEffect(() => {
    if (calculatedGoals) {
      setGoals(calculatedGoals);
      setTempGoals(calculatedGoals);
    }
  }, [calculatedGoals]);

  useEffect(() => {
    // Load saved goals from localStorage only if no calculated goals are provided
    if (!calculatedGoals) {
      const savedGoals = localStorage.getItem('userGoals');
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals);
        setGoals(parsedGoals);
        setTempGoals(parsedGoals);
        if (onGoalsChange) {
          onGoalsChange(parsedGoals);
        }
      }
    }
  }, [calculatedGoals, onGoalsChange]);

  const handleEdit = () => {
    setIsEditing(true);
    setTempGoals({ ...goals });
    setShowCalculationDetails(false);
  };

  const handleSave = async () => {
    setGoals(tempGoals);
    setIsEditing(false);
    setShowCalculationDetails(false);
    // Save to localStorage to persist user's custom goals
    localStorage.setItem('userGoals', JSON.stringify(tempGoals));
    localStorage.setItem('goalsSource', 'manual'); // Mark as manually set
    if (onGoalsChange) {
      onGoalsChange(tempGoals);
    }
    // Sync to backend
    try {
      await updateUserProfile({
        dailyCaloriesConsumed: tempGoals.dailyCaloriesConsumed,
        dailyCalorieDeficit: tempGoals.dailyCalorieDeficit
      });
      // Update today's GoalCompletion record on backend
      await updateGoalCompletion({
        goals: {
                  dailyCaloriesConsumed: tempGoals.dailyCaloriesConsumed,
        dailyCalorieDeficit: tempGoals.dailyCalorieDeficit
        }
      });
    } catch (err) {
      console.error('Failed to sync goals to backend:', err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempGoals({ ...goals });
    setShowCalculationDetails(false);
  };

  const handleInputChange = (field, value) => {
    const numValue = parseInt(value) || 0;
    setTempGoals(prev => ({
      ...prev,
      [field]: Math.max(0, numValue)
    }));
  };

  const handleCalculateFromProfile = () => {
    if (!user || !user.height || !user.weight || !user.gender) {
      alert('Please complete your profile with height, weight, and gender to calculate personalized goals.');
      return;
    }

    const details = getCalculationDetails(
      user.height,
      user.weight,
      user.gender,
      user.age
    );

    if (details.canCalculate) {
      setCalculationDetails(details);
      setTempGoals(details.goals);
      setShowCalculationDetails(true);
      console.log('[GoalsCard] Calculated goals from profile:', details);
    } else {
      alert(`Missing profile information: ${details.missingFields.join(', ')}`);
    }
  };

  return (
    <div className="card goals-card">
      <div className="card-header">
        <div className="card-icon">🎯</div>
        <h3>Daily Goals</h3>
        {!isEditing && (
          <button 
            className="goals-edit-btn"
            onClick={handleEdit}
          >
            ✏️
          </button>
        )}
      </div>
      
      <div className="card-content">
        {isEditing ? (
          <div className="goals-form">
            <div className="goals-input-group">
              <label htmlFor="dailyCaloriesConsumed">Daily Calories Consumed:</label>
              <input
                type="number"
                id="dailyCaloriesConsumed"
                value={tempGoals.dailyCaloriesConsumed}
                onChange={(e) => handleInputChange('dailyCaloriesConsumed', e.target.value)}
                min="0"
                className="goals-input"
              />
            </div>
            

            
            <div className="goals-input-group">
              <label htmlFor="dailyCalorieDeficit">Daily Calorie Deficit:</label>
              <input
                type="number"
                id="dailyCalorieDeficit"
                value={tempGoals.dailyCalorieDeficit}
                onChange={(e) => handleInputChange('dailyCalorieDeficit', e.target.value)}
                min="0"
                className="goals-input"
              />
            </div>
            
            <div className="goals-calculate-section">
              <button 
                className="goals-calculate-btn"
                onClick={handleCalculateFromProfile}
                disabled={!user || !user.height || !user.weight || !user.gender}
              >
                🧮 Calculate based on your profile
              </button>
              {(!user || !user.height || !user.weight || !user.gender) && (
                <p className="goals-calculate-note">
                  Complete your profile with height, weight, and gender to enable automatic calculation
                </p>
              )}
            </div>
            
            <div className="goals-actions">
              <button 
                className="goals-save-btn"
                onClick={handleSave}
              >
                Save
              </button>
              <button 
                className="goals-cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="goals-display">
            <div className="goals-goal-item">
              <span className="goals-goal-label">Calories Consumed:</span>
              <span className="goals-goal-value">{goals.dailyCaloriesConsumed.toLocaleString()}</span>
            </div>

            <div className="goals-goal-item">
              <span className="goals-goal-label">Calorie Deficit:</span>
              <span className="goals-goal-value">{goals.dailyCalorieDeficit.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsCard; 