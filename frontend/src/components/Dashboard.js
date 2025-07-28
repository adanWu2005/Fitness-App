import React, { useState, useEffect } from 'react';
import CaloriesCard from './CaloriesCard';
import CalorieDeficitCard from './CalorieDeficitCard';
import WorkoutCard from './WorkoutCard';
import FoodCard from './FoodCard';
import GoalsCard from './GoalsCard';
import ProfileCard from './ProfileCard';
import YourStatsCard from './YourStatsCard';
import DailyLogsModal from './DailyLogsModal';
import { fetchActivityData, updateGoalCompletion, checkDailyGoalCompletion } from '../services/api';
import { calculatePersonalizedGoals } from '../services/goalsService';

const Dashboard = ({ user, activity }) => {
  const [calories, setCalories] = useState(activity ? activity.calories : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [goals, setGoals] = useState({
    dailyCaloriesConsumed: 2000,
    dailyCalorieDeficit: 500
  });
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null,
    title: '',
    icon: ''
  });

  useEffect(() => {
    console.log('[Dashboard] props:', { user, activity });
    console.log('[Dashboard] state: calories:', calories);
    console.log('[Dashboard] user.fitbitConnected:', user?.fitbitConnected);
    console.log('[Dashboard] activity data:', activity);
  }, [user, activity, calories]);

  // Calculate personalized goals when user data changes (only if no existing goals)
  useEffect(() => {
    if (user && user.height && user.weight && user.gender) {
      // Check if there are existing goals in localStorage
      const existingGoals = localStorage.getItem('userGoals');
      const goalsSource = localStorage.getItem('goalsSource'); // 'auto' or 'manual'
      
      if (!existingGoals) {
        // Only calculate if no existing goals at all
        const personalizedGoals = calculatePersonalizedGoals(
          user.height,
          user.weight,
          user.gender
        );
        setGoals(personalizedGoals);
        localStorage.setItem('userGoals', JSON.stringify(personalizedGoals));
        localStorage.setItem('goalsSource', 'auto');
        console.log('[Dashboard] Personalized goals calculated (no existing goals):', personalizedGoals);
      } else if (goalsSource === 'auto') {
        // Only recalculate if goals were previously auto-calculated
        const personalizedGoals = calculatePersonalizedGoals(
          user.height,
          user.weight,
          user.gender
        );
        setGoals(personalizedGoals);
        localStorage.setItem('userGoals', JSON.stringify(personalizedGoals));
        localStorage.setItem('goalsSource', 'auto');
        console.log('[Dashboard] Personalized goals recalculated (auto source):', personalizedGoals);
      } else {
        // Use existing goals from localStorage (manual or auto)
        const parsedGoals = JSON.parse(existingGoals);
        setGoals(parsedGoals);
        console.log('[Dashboard] Using existing goals from localStorage:', parsedGoals);
      }
    }
  }, [user?.height, user?.weight, user?.gender]); // Only depend on the specific profile fields

  // Listen for changes in localStorage userGoals (when updated from profile)
  useEffect(() => {
    const checkForGoalUpdates = () => {
      const savedGoals = localStorage.getItem('userGoals');
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals);
        // Only update if the goals are actually different to avoid unnecessary re-renders
        setGoals(prevGoals => {
          if (JSON.stringify(prevGoals) !== JSON.stringify(parsedGoals)) {
            console.log('[Dashboard] Goals updated from localStorage:', parsedGoals);
            return parsedGoals;
          }
          return prevGoals;
        });
      }
    };

    // Check immediately
    checkForGoalUpdates();

    // Listen for storage events
    window.addEventListener('storage', checkForGoalUpdates);
    return () => window.removeEventListener('storage', checkForGoalUpdates);
  }, []);

  // Check daily goal completion when dashboard loads
  useEffect(() => {
    const ensureDailyCompletion = async () => {
      try {
        await checkDailyGoalCompletion();
        console.log('[Dashboard] Daily goal completion checked');
      } catch (error) {
        console.error('[Dashboard] Error checking daily goal completion:', error);
      }
    };

    if (user) {
      ensureDailyCompletion();
    }
  }, [user]);

  const loadData = async () => {
    // Only load data if user is connected to Fitbit
    if (!user || !user.fitbitConnected) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchActivityData();
      setCalories(data.calories);
      setLastUpdated(new Date());

      // Update goal completion tracking
      try {
        const caloriesConsumed = calculateTotalCaloriesConsumed();
        const calorieDeficit = data.calories - caloriesConsumed;
        await updateGoalCompletion({
          caloriesBurned: data.calories,
  
          calorieDeficit, // allow negative values
          caloriesConsumed, // store for future use
          goals: goals
        });
      } catch (goalError) {
        console.error('Error updating goal completion:', goalError);
        // Don't show this error to the user as it's not critical
      }
    } catch (err) {
      setError('Failed to load fitness data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load data if user is connected to Fitbit and we don't have activity data
    if (user && user.fitbitConnected && !activity) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    } else if (user && user.fitbitConnected && activity) {
      // If we have activity data, set it directly
      setCalories(activity.calories);
      setLoading(false);
      
      // Update goal completion tracking with activity data
      try {
        const caloriesConsumed = calculateTotalCaloriesConsumed();
        const calorieDeficit = activity.calories - caloriesConsumed;
        updateGoalCompletion({
          caloriesBurned: activity.calories,
          calorieDeficit, // allow negative values
          caloriesConsumed, // store for future use
          goals: goals
        });
      } catch (goalError) {
        console.error('Error updating goal completion:', goalError);
        // Don't show this error to the user as it's not critical
      }
    } else {
      // No Fitbit connection, don't load data
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [user, activity]);

  const handleCardClick = (type) => {
    const modalConfig = {
      calories: {
        title: 'Calories Burned',
        icon: '🔥'
      },
      deficit: {
        title: 'Calorie Deficit',
        icon: '📉'
      }
    };

    const config = modalConfig[type];
    if (config) {
      setModalState({
        isOpen: true,
        type,
        title: config.title,
        icon: config.icon
      });
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: null,
      title: '',
      icon: ''
    });
  };

  // Helper to get meals key for localStorage
  const getMealsKey = (folderId) => `folderMeals_${user?.id}_${folderId}`;

  // Calculate total calories consumed from all meals in all folders
  const calculateTotalCaloriesConsumed = () => {
    if (!user) return 0;
    const foldersRaw = localStorage.getItem('mealFolders_' + user.id);
    const folders = foldersRaw ? JSON.parse(foldersRaw) : [];
    let total = 0;
    folders.forEach(folder => {
      const storedMeals = localStorage.getItem(getMealsKey(folder.id));
      const meals = storedMeals ? JSON.parse(storedMeals) : [];
      meals.forEach(meal => {
        if (meal.nutrition) {
          total += meal.nutrition.calories || 0;
        }
      });
    });
    return total;
  };

  // Don't show loading state if user isn't connected to Fitbit
  if (loading && (!user || !user.fitbitConnected)) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Today's Activity</h2>
        </div>
        <div className="cards-container">
          <FoodCard />
          <WorkoutCard />
        </div>
        <div className="dashboard-footer">
          <p>Connect to Fitbit to sync your fitness data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Today's Activity</h2>
        {user && user.fitbitConnected && (
          <>
            <div className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <button 
              className="refresh-btn"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </>
        )}
      </div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div className={`cards-container ${user && user.fitbitConnected ? 'authenticated' : ''}`}>
        {user && user.fitbitConnected ? (
          <>
            {/* Row 1: Meal and Workout Management */}
            <FoodCard />
            <WorkoutCard />
            
            {/* Row 2: Calories */}
            <CaloriesCard 
              calories={calories} 
              loading={loading} 
              dailyGoal={goals.dailyCaloriesConsumed}
              onClick={() => handleCardClick('calories')}
            />
            
            {/* Row 3: Calorie Deficit, Goals, and Profile/Stats */}
            <CalorieDeficitCard 
              caloriesBurned={calories} 
              loading={loading} 
              user={user} 
              dailyGoal={goals.dailyCalorieDeficit}
              onClick={() => handleCardClick('deficit')}
              caloriesConsumed={calculateTotalCaloriesConsumed()}
            />
            <GoalsCard calculatedGoals={goals} onGoalsChange={setGoals} user={user} />
            <div className="bottom-right-cards">
              <ProfileCard user={user} />
              <YourStatsCard />
            </div>
          </>
        ) : (
          <>
            <FoodCard />
            <WorkoutCard />
          </>
        )}
      </div>
      <div className="dashboard-footer">
        {user && user.fitbitConnected ? (
          <p>Data synced from Fitbit</p>
        ) : (
          <p>Connect to Fitbit to sync your fitness data</p>
        )}
      </div>

      {/* Daily Logs Modal */}
      <DailyLogsModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        icon={modalState.icon}
      />
    </div>
  );
};

export default Dashboard;