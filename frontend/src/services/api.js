const API_BASE_URL = "https://fitness-app-lbbf.onrender.com";

// Helper function to get auth token  
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to create headers with auth
const createAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const fetchActivityData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/fitbit/activity`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching activity data:', error);
    throw error;
  }
};

export const fetchSteps = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/fitbit/steps`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.steps;
  } catch (error) {
    console.error('Error fetching steps:', error);
    throw error;
  }
};

export const fetchCalories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/fitbit/calories`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.calories;
  } catch (error) {
    console.error('Error fetching calories:', error);
    throw error;
  }
};

// Workout API functions
export const fetchWorkoutFolders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/folders`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.folders;
  } catch (error) {
    console.error('Error fetching workout folders:', error);
    throw error;
  }
};

export const createWorkoutFolder = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/folders`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.folder;
  } catch (error) {
    console.error('Error creating workout folder:', error);
    throw error;
  }
};

export const fetchWorkouts = async (folderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/workouts/${folderId}`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.workouts;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
};

// Meals API functions
export const fetchMealFolders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/meals/folders`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.folders;
  } catch (error) {
    console.error('Error fetching meal folders:', error);
    throw error;
  }
};

export const createMealFolder = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meals/folders`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.folder;
  } catch (error) {
    console.error('Error creating meal folder:', error);
    throw error;
  }
};

export const fetchMeals = async (folderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meals/meals/${folderId}`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.meals;
  } catch (error) {
    console.error('Error fetching meals:', error);
    throw error;
  }
};

// Goal completion API functions
export const fetchGoalStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/goals/stats`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching goal stats:', error);
    throw error;
  }
};

export const updateGoalCompletion = async (completionData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/goals/complete`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify(completionData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating goal completion:', error);
    throw error;
  }
};

export const fetchRecentGoalCompletions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/goals/recent`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching recent goal completions:', error);
    throw error;
  }
};

export const checkDailyGoalCompletion = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/goals/check-daily-completion`, {
      method: 'POST',
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking daily goal completion:', error);
    throw error;
  }
};

export const fetchCaloriesLogs = async (days = 7) => {
  try {
    const response = await fetch(`${API_BASE_URL}/fitbit/logs/calories?days=${days}`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API] Calories logs response:', data);
    return data.logs || [];
  } catch (error) {
    console.error('Error fetching calories logs:', error);
    throw error;
  }
};

export const fetchStepsLogs = async (days = 7) => {
  try {
    const response = await fetch(`${API_BASE_URL}/fitbit/logs/steps?days=${days}`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API] Steps logs response:', data);
    return data.logs || [];
  } catch (error) {
    console.error('Error fetching steps logs:', error);
    throw error;
  }
};

export const fetchDeficitLogs = async (days = 7) => {
  try {
    const response = await fetch(`${API_BASE_URL}/fitbit/logs/deficit?days=${days}`, {
      headers: createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API] Deficit logs response:', data);
    return data.logs || [];
  } catch (error) {
    console.error('Error fetching deficit logs:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};