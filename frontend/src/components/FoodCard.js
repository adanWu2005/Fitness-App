import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Food.css';

const FoodCard = () => {
  const navigate = useNavigate();

  return (
    <div className="card food-card">
      <div className="card-header">
        <div className="card-icon">🍽️</div>
        <h3>Meal Management</h3>
      </div>
      <div className="card-content">
        <div className="main-stat">
          <span className="stat-number">Track your meals!</span>
        </div>
        <button className="food-btn" onClick={() => navigate('/meals')}>
          Manage Meals
        </button>
      </div>
    </div>
  );
};

export default FoodCard; 