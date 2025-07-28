import React, { useState, useEffect } from 'react';
import { fetchGoalStats } from '../services/api';
import './YourStatsCard.css';

const YourStatsCard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchGoalStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error loading goal stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatPercentage = (rate) => {
    return Math.round(rate);
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return '#4CAF50'; // Green
    if (rate >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const navigateStats = (direction) => {
    if (direction === 'next') {
      setCurrentStatIndex((prev) => (prev + 1) % 2);
    } else {
      setCurrentStatIndex((prev) => (prev - 1 + 2) % 2);
    }
  };

  const CircularProgress = ({ percentage, completed, total, label, icon, size = 120 }) => {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const color = getCompletionColor(percentage);

    return (
      <div className="circular-progress-container">
        <svg width={size} height={size} className="circular-progress">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f0f0f0"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="circular-progress-content">
          <div className="circular-progress-icon">{icon}</div>
          <div className="circular-progress-fraction">{completed}/{total}</div>
        </div>
        <div className="circular-progress-label">{label}</div>
      </div>
    );
  };

  const getCurrentStat = () => {
    if (!stats) return null;

    const statsData = [
      {
        percentage: stats.caloriesCompletionRate,
        completed: stats.caloriesGoalCompleted,
        total: stats.totalDays || 0,
        label: "Calories Burned",
        icon: "🔥"
      },

      {
        percentage: stats.calorieDeficitCompletionRate,
        completed: stats.calorieDeficitGoalCompleted,
        total: stats.totalDays || 0,
        label: "Calorie Deficit",
        icon: "⚖️"
      }
    ];

    return statsData[currentStatIndex];
  };

  if (loading) {
    return (
      <div className="your-stats-card">
        <div className="stats-header">
          <h3>Your Stats</h3>
        </div>
        <div className="stats-content">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="your-stats-card">
        <div className="stats-header">
          <h3>Your Stats</h3>
        </div>
        <div className="stats-content">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  // Show stats even if totalDays is 0 (new account case)
  if (!stats) {
    return (
      <div className="your-stats-card">
        <div className="stats-header">
          <h3>Your Stats</h3>
        </div>
        <div className="stats-content">
          <div className="no-data-message">
            <p>No data available yet</p>
            <p className="subtitle">Complete your first day to see your stats!</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStat = getCurrentStat();

  return (
    <div className="your-stats-card">
      <div className="stats-header">
        <h3>Your Stats</h3>
        <div className="stats-subtitle">
          {stats.accountCreatedToday 
            ? "Since account creation (0 days)"
            : `Based on your daily logs (${stats.totalDays} days)`
          }
        </div>
      </div>
      <div className="stats-content">
        <div className="single-stat-container">
          <button 
            className="nav-arrow nav-arrow-left"
            onClick={(e) => {
              e.stopPropagation();
              navigateStats('prev');
            }}
          >
            ‹
          </button>
          
          <CircularProgress
            percentage={currentStat.percentage}
            completed={currentStat.completed}
            total={currentStat.total}
            label={currentStat.label}
            icon={currentStat.icon}
            size={90}
          />
          
          <button 
            className="nav-arrow nav-arrow-right"
            onClick={(e) => {
              e.stopPropagation();
              navigateStats('next');
            }}
          >
            ›
          </button>
        </div>
        
        <div className="stat-indicators">
          <div className={`indicator ${currentStatIndex === 0 ? 'active' : ''}`}></div>
          <div className={`indicator ${currentStatIndex === 1 ? 'active' : ''}`}></div>
        </div>
      </div>
    </div>
  );
};

export default YourStatsCard; 