import React, { useState, useEffect } from 'react';
import { fetchCaloriesLogs, fetchStepsLogs, fetchDeficitLogs } from '../services/api';
import './DailyLogsModal.css';

const DailyLogsModal = ({ isOpen, onClose, type, title, icon }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [daysFilter, setDaysFilter] = useState(7);

  useEffect(() => {
    if (isOpen && type) {
      fetchLogs();
    }
  }, [isOpen, type, daysFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let logsData;
      switch (type) {
        case 'calories':
          logsData = await fetchCaloriesLogs(daysFilter);
          break;
        case 'steps':
          logsData = await fetchStepsLogs(daysFilter);
          break;
        case 'deficit':
          logsData = await fetchDeficitLogs(daysFilter);
          break;
        default:
          throw new Error('Invalid log type');
      }
      
      console.log(`[DailyLogsModal] Fetched ${type} logs:`, logsData);
      setLogs(logsData || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load daily logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Unknown Date';
    }

    try {
      const date = new Date(dateString);

      // Get today's date in UTC
      const now = new Date();
      const todayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      ));

      // Compare only the date part in UTC
      const isToday = (
        date.getUTCFullYear() === todayUTC.getUTCFullYear() &&
        date.getUTCMonth() === todayUTC.getUTCMonth() &&
        date.getUTCDate() === todayUTC.getUTCDate()
      );

      if (isToday) {
        return 'Today';
      }

      // Always format as UTC
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  const formatValue = (value, type) => {
    // Handle undefined or null values
    if (value === undefined || value === null) {
      return '0';
    }
    
    if (type === 'steps') {
      return value.toLocaleString();
    } else {
      return value.toLocaleString();
    }
  };

  const getGoalStatus = (value, goal, type) => {
    if (!goal) return 'no-goal';
    if (value === undefined || value === null) return 'not-achieved';
    if (type === 'deficit') {
      return value >= goal ? 'achieved' : 'not-achieved';
    } else {
      return value >= goal ? 'achieved' : 'not-achieved';
    }
  };

  const getGoalValue = (log, type) => {
    if (!log.goals) return null;
    switch (type) {
      case 'calories':
        return log.goals.dailyCaloriesConsumed || null;
      case 'steps':
        return log.goals.dailySteps || null;
      case 'deficit':
        return log.goals.dailyCalorieDeficit || null;
      default:
        return null;
    }
  };

  const getValue = (log, type) => {
    switch (type) {
      case 'calories':
        return log.caloriesBurned || 0;
      case 'steps':
        return log.steps || 0;
      case 'deficit':
        return log.calorieDeficit || 0;
      default:
        return 0;
    }
  };

  if (!isOpen) return null;

  // Sort logs by date descending before rendering
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="daily-logs-modal-overlay" onClick={onClose}>
      <div className="daily-logs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">{icon}</span>
            <h3>{title} - Daily Logs</h3>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-filters">
          <label htmlFor="days-filter">Show last:</label>
          <select 
            id="days-filter"
            value={daysFilter} 
            onChange={(e) => setDaysFilter(parseInt(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="logs-loading">
              <div className="loading-spinner"></div>
              <p>Loading daily logs...</p>
            </div>
          ) : error ? (
            <div className="logs-error">
              <p>{error}</p>
              <button onClick={fetchLogs}>Try Again</button>
            </div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">
              <p>No daily logs found for the selected period.</p>
              <p className="logs-empty-hint">Daily logs will appear here once you start tracking your activity.</p>
            </div>
          ) : (
            <div className="logs-list">
              {Array.isArray(sortedLogs) && sortedLogs.map((log, index) => {
                console.log(`[DailyLogsModal] Processing log ${index}:`, log);
                const value = getValue(log, type);
                const goal = getGoalValue(log, type);
                let status = getGoalStatus(value, goal, type);
                const isToday = formatDate(log.date) === 'Today';

                // Custom logic for deficit: only 'achieved' if within 200 calories
                let isWithin200 = false;
                let isWithin50 = false;
                if (type === 'deficit' && goal !== null && goal !== undefined) {
                  isWithin200 = Math.abs(value - goal) <= 200;
                  isWithin50 = Math.abs(value - goal) <= 50;
                  status = isWithin200 ? 'achieved' : 'not-achieved';
                }

                return (
                  <div key={index} className={`log-item${status === 'achieved' ? ' achieved' : ''}${status === 'not-achieved' ? ' not-achieved' : ''}${isToday ? ' today' : ''}`}>
                    <div className="log-date">
                      {formatDate(log.date)}
                    </div>
                    <div className="log-value">
                      {type === 'deficit' ? (
                        <span
                          className={`deficit-value ${value < 0 ? 'surplus' : value > 0 ? 'deficit' : ''}`}
                        >
                          {value > 0 ? '+' : ''}{value.toLocaleString()} cal
                        </span>
                      ) : (
                        <>
                          {formatValue(value, type)}
                          {type === 'calories' && <span className="unit">cal</span>}
                          {type === 'steps' && <span className="unit">steps</span>}
                        </>
                      )}
                    </div>
                    {goal && (
                      <div className="log-goal">
                        <span className="goal-label">Goal:</span>
                        <span className="goal-value">{formatValue(goal, type)}</span>
                        <span className={`goal-status ${status}`}>
                          {type === 'deficit'
                            ? (isWithin50 ? '✅✅' : isWithin200 ? '✅' : '⏰')
                            : (status === 'achieved' ? '✅' : (isToday ? '⏰' : '❌'))}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyLogsModal; 