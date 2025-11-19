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
    
    // Use UTC methods to avoid timezone issues
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Validate the date is not in the future (safety check)
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const calculatedDate = new Date(dateString + 'T00:00:00Z');
    
    if (calculatedDate > todayUTC) {
      console.warn('[FitbitService] ⚠️ Calculated date is in the future, using yesterday instead');
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayYear = yesterday.getUTCFullYear();
      const yesterdayMonth = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
      const yesterdayDay = String(yesterday.getUTCDate()).padStart(2, '0');
      const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
      console.log('[FitbitService] Using yesterday date:', yesterdayString);
      return yesterdayString;
    }
    
    console.log('[FitbitService] Current date (UTC):', dateString);
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
      
      // Use the correct Fitbit API endpoint format - should be activities/calories not activities/calories
      const apiUrl = `${this.baseURL}/activities/calories/date/${today}/1d.json`;
      console.log('[FitbitService] API URL:', apiUrl);
      console.log('[FitbitService] Request headers:', this.getHeaders(accessToken));
      
      const response = await axios.get(apiUrl, { headers: this.getHeaders(accessToken) });
      
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