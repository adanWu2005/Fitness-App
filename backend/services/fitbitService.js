const axios = require('axios');
const { isTokenExpiredError } = require('../middleware/tokenRefresh');

class FitbitService {
  constructor() {
    this.baseURL = 'https://api.fitbit.com/1/user/-';
  }

  getHeaders(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Helper method to get today's date in YYYY-MM-DD format using UTC
  // Fitbit API expects dates in YYYY-MM-DD format, and we use UTC to avoid timezone issues
  getTodaysDate() {
    const now = new Date();
    
    // Use UTC methods to get today's date consistently
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    console.log('[FitbitService] Using today\'s date (UTC):', dateString);
    console.log('[FitbitService] Server time (UTC):', now.toISOString());
    
    return dateString;
  }



  async getTodaysCalories(accessToken) {
    try {
      // Check if we have a valid access token
      if (!accessToken) {
        console.error('[FitbitService] No access token provided for calories request');
        throw new Error('No access token provided');
      }
      
      const today = this.getTodaysDate();
      console.log('[FitbitService] Fetching calories for date:', today);
      console.log('[FitbitService] Current server time:', new Date().toISOString());
      console.log('[FitbitService] Using access token:', accessToken.substring(0, 20) + '...');
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(today)) {
        throw new Error(`Invalid date format: ${today}. Expected YYYY-MM-DD format.`);
      }
      
      // Use the correct Fitbit API endpoint format
      const apiUrl = `${this.baseURL}/activities/calories/date/${today}/1d.json`;
      console.log('[FitbitService] API URL:', apiUrl);
      console.log('[FitbitService] Request headers:', this.getHeaders(accessToken));
      
      let response;
      try {
        response = await axios.get(apiUrl, { headers: this.getHeaders(accessToken) });
      } catch (apiError) {
        // If we get a "date in the future" error, try with an earlier date
        if (apiError.response?.status === 400) {
          const errorData = apiError.response?.data;
          const errorString = JSON.stringify(errorData || {});
          const errorMessage = apiError.message || '';
          
          // Check both the error data and the error message for "future" indicators
          if (errorString.includes('future') || errorString.includes('INVALID_ARGUMENT') || 
              errorString.includes('Time range start time cannot be in the future') ||
              errorMessage.includes('future') || errorMessage.includes('INVALID_ARGUMENT')) {
            console.warn('[FitbitService] Today\'s date was rejected as future by Fitbit, trying with yesterday...');
            
            // Try with yesterday (using UTC to avoid timezone issues)
            const yesterday = new Date();
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            const yesterdayYear = yesterday.getUTCFullYear();
            const yesterdayMonth = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
            const yesterdayDay = String(yesterday.getUTCDate()).padStart(2, '0');
            const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
            
            const retryUrl = `${this.baseURL}/activities/calories/date/${yesterdayString}/1d.json`;
            console.log('[FitbitService] Retrying with yesterday\'s date:', yesterdayString);
            response = await axios.get(retryUrl, { headers: this.getHeaders(accessToken) });
          } else {
            throw apiError;
          }
        } else {
          throw apiError;
        }
      }
      
      console.log('[FitbitService] Calories API response:', JSON.stringify(response.data, null, 2));
      
      // Validate response structure
      if (!response.data || !response.data['activities-calories']) {
        console.error('[FitbitService] Invalid response structure:', response.data);
        throw new Error('Invalid response from Fitbit API: missing activities-calories data');
      }
      
      const activitiesCalories = response.data['activities-calories'];
      if (!Array.isArray(activitiesCalories) || activitiesCalories.length === 0) {
        console.warn('[FitbitService] No calories data found for today, returning 0');
        return 0;
      }
      
      const caloriesData = activitiesCalories[0];
      if (!caloriesData) {
        console.warn('[FitbitService] No calories data object found, returning 0');
        return 0;
      }
      
      // Handle missing or invalid value
      if (caloriesData.value === undefined || caloriesData.value === null || caloriesData.value === '') {
        console.warn('[FitbitService] Calories value is missing or empty, returning 0');
        return 0;
      }
      
      const calories = parseInt(caloriesData.value);
      if (isNaN(calories)) {
        console.error('[FitbitService] Invalid calories value (cannot parse):', caloriesData.value);
        throw new Error(`Invalid calories value from Fitbit API: ${caloriesData.value}`);
      }
      
      console.log('[FitbitService] Parsed calories value:', calories);
      return calories;
    } catch (error) {
      console.error('[FitbitService] Error fetching calories:', error.response?.data || error.message);
      console.error('[FitbitService] Full error object:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Log the specific Fitbit API error details
      if (error.response?.data) {
        console.log('[FitbitService] Fitbit API error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Check if it's a token expiration error
      if (isTokenExpiredError(error)) {
        console.log('[FitbitService] Token expired error detected, throwing error for refresh');
        throw error; // Re-throw to trigger token refresh
      }
      
      // Re-throw the error to be handled by the calling route
      throw error;
    }
  }

  async getUserProfile(accessToken) {
    try {
      // Check if we have a valid access token
      if (!accessToken) {
        console.error('[FitbitService] No access token provided for profile request');
        throw new Error('No access token provided');
      }
      
      console.log('[FitbitService] Fetching user profile from Fitbit');
      console.log('[FitbitService] Using access token:', accessToken.substring(0, 20) + '...');
      
      const response = await axios.get(
        `${this.baseURL}/profile.json`,
        { headers: this.getHeaders(accessToken) }
      );
      
      console.log('[FitbitService] Profile API response:', JSON.stringify(response.data, null, 2));
      
      const profile = response.data.user;
      const profileData = {
        height: profile.height || null, // Height in cm
        weight: profile.weight || null, // Weight in kg (already in correct format)
        gender: profile.gender ? profile.gender.toLowerCase() : null
      };
      
      console.log('[FitbitService] Parsed profile data:', profileData);
      return profileData;
    } catch (error) {
      console.error('[FitbitService] Error fetching profile:', error.response?.data || error.message);
      
      // Check if it's a token expiration error
      if (isTokenExpiredError(error)) {
        console.log('[FitbitService] Token expired error detected, throwing error for refresh');
        throw error; // Re-throw to trigger token refresh
      }
      
      // Re-throw the error to be handled by the calling route
      throw error;
    }
  }

}

module.exports = new FitbitService();