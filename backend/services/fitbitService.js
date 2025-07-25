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

  // Helper method to get today's date in YYYY-MM-DD format using local timezone
  getTodaysDate() {
    const now = new Date();
    console.log('[FitbitService] Raw date object:', now);
    console.log('[FitbitService] Date.toISOString():', now.toISOString());
    console.log('[FitbitService] Date.toLocaleDateString():', now.toLocaleDateString());
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Check if the calculated date is in the future
    const today = new Date();
    const calculatedDate = new Date(dateString);
    if (calculatedDate > today) {
      console.log('[FitbitService] ⚠️ Calculated date is in the future, using yesterday instead');
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayYear = yesterday.getFullYear();
      const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
      console.log('[FitbitService] Using yesterday date:', yesterdayString);
      return yesterdayString;
    }
    
    console.log('[FitbitService] Current date (local):', dateString);
    return dateString;
  }

  async getTodaysSteps(accessToken) {
    try {
      // Check if we have a valid access token
      if (!accessToken) {
        console.error('[FitbitService] No access token provided for steps request');
        throw new Error('No access token provided');
      }
      
      const today = this.getTodaysDate();
      console.log('[FitbitService] Fetching steps for date:', today);
      console.log('[FitbitService] Using access token:', accessToken.substring(0, 20) + '...');
      
      const response = await axios.get(
        `${this.baseURL}/activities/steps/date/${today}/1d.json`,
        { headers: this.getHeaders(accessToken) }
      );
      
      console.log('[FitbitService] Steps API response:', JSON.stringify(response.data, null, 2));
      
      const stepsData = response.data['activities-steps'][0];
      const steps = parseInt(stepsData.value);
      console.log('[FitbitService] Parsed steps value:', steps);
      return steps;
    } catch (error) {
      console.error('[FitbitService] Error fetching steps:', error.response?.data || error.message);
      
      // Check if it's a token expiration error
      if (isTokenExpiredError(error)) {
        console.log('[FitbitService] Token expired error detected, throwing error for refresh');
        throw error; // Re-throw to trigger token refresh
      }
      
      console.log('[FitbitService] Falling back to mock steps data');
      // Return mock data for development
      return this.getMockSteps();
    }
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
      console.log('[FitbitService] Using access token:', accessToken.substring(0, 20) + '...');
      
      const response = await axios.get(
        `${this.baseURL}/activities/calories/date/${today}/1d.json`,
        { headers: this.getHeaders(accessToken) }
      );
      
      console.log('[FitbitService] Calories API response:', JSON.stringify(response.data, null, 2));
      
      const caloriesData = response.data['activities-calories'][0];
      const calories = parseInt(caloriesData.value);
      console.log('[FitbitService] Parsed calories value:', calories);
      return calories;
    } catch (error) {
      console.error('[FitbitService] Error fetching calories:', error.response?.data || error.message);
      
      // Check if it's a token expiration error
      if (isTokenExpiredError(error)) {
        console.log('[FitbitService] Token expired error detected, throwing error for refresh');
        throw error; // Re-throw to trigger token refresh
      }
      
      console.log('[FitbitService] Falling back to mock calories data');
      // Return mock data for development
      return this.getMockCalories();
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
      
      console.log('[FitbitService] Falling back to mock profile data');
      // Return mock data for development
      return this.getMockProfile();
    }
  }

  // Mock data for development/testing
  getMockSteps() {
    const baseSteps = 3000;
    const randomSteps = Math.floor(Math.random() * 5000);
    return baseSteps + randomSteps;
  }

  getMockCalories() {
    const baseCalories = 1200;
    const randomCalories = Math.floor(Math.random() * 800);
    return baseCalories + randomCalories;
  }

  getMockProfile() {
    console.log('[FitbitService] Returning mock profile data');
    // Generate slightly varied mock data to make it more realistic
    const heights = [165, 170, 175, 180, 185];
    const weights = [60, 65, 70, 75, 80];
    const genders = ['male', 'female'];
    
    return {
      height: heights[Math.floor(Math.random() * heights.length)],
      weight: weights[Math.floor(Math.random() * weights.length)],
      gender: genders[Math.floor(Math.random() * genders.length)]
    };
  }
}

module.exports = new FitbitService();