const express = require('express');
const router = express.Router();
const fitbitService = require('../services/fitbitService');
const { authenticateToken, requireFitbitConnection } = require('../middleware/auth');
const { refreshTokenIfNeeded, withTokenRefresh, isTokenExpiredError } = require('../middleware/tokenRefresh');



// Get today's calories burned
router.get('/calories', authenticateToken, requireFitbitConnection, refreshTokenIfNeeded, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 🔥 Fetching calories for user:', req.user._id);
    
    // Double-check that we have valid tokens after refresh
    if (!req.user.fitbitTokens || !req.user.fitbitTokens.access_token) {
      console.error('[Fitbit Routes] No valid access token after refresh');
      return res.status(401).json({ 
        error: 'No valid Fitbit access token. Please reconnect your Fitbit account.' 
      });
    }
    
    const calories = await fitbitService.getTodaysCalories(req.user.fitbitTokens.access_token);
    console.log('[Fitbit Routes] ✅ Calories fetched successfully:', calories);
    res.json({ calories });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching calories:', error);
    
    // Check if it's a token expiration error
    if (isTokenExpiredError(error)) {
      return res.status(401).json({ 
        error: 'Fitbit token expired. Please reconnect your Fitbit account.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch calories data' });
  }
});

// Get calories in one call
router.get('/activity', authenticateToken, requireFitbitConnection, refreshTokenIfNeeded, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 🏃 Fetching activity data for user:', req.user._id);
    
    // Double-check that we have valid tokens after refresh
    if (!req.user.fitbitTokens || !req.user.fitbitTokens.access_token) {
      console.error('[Fitbit Routes] No valid access token after refresh');
      return res.status(401).json({ 
        error: 'No valid Fitbit access token. Please reconnect your Fitbit account.' 
      });
    }
    
    const calories = await fitbitService.getTodaysCalories(req.user.fitbitTokens.access_token);
    console.log('[Fitbit Routes] ✅ Activity data fetched successfully - Calories:', calories);
    res.json({ calories });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching activity data:', error);
    
    // Check if it's a token expiration error
    if (isTokenExpiredError(error)) {
      return res.status(401).json({ 
        error: 'Fitbit token expired. Please reconnect your Fitbit account.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

// Get user profile from Fitbit
router.get('/profile', authenticateToken, requireFitbitConnection, refreshTokenIfNeeded, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 👤 Fetching profile data for user:', req.user._id);
    
    // Double-check that we have valid tokens after refresh
    if (!req.user.fitbitTokens || !req.user.fitbitTokens.access_token) {
      console.error('[Fitbit Routes] No valid access token after refresh');
      return res.status(401).json({ 
        error: 'No valid Fitbit access token. Please reconnect your Fitbit account.' 
      });
    }
    
    const profile = await fitbitService.getUserProfile(req.user.fitbitTokens.access_token);
    console.log('[Fitbit Routes] ✅ Profile data fetched successfully:', profile);
    res.json(profile);
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching profile data:', error);
    
    // Check if it's a token expiration error
    if (isTokenExpiredError(error)) {
      return res.status(401).json({ 
        error: 'Fitbit token expired. Please reconnect your Fitbit account.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// Debug route to check token status
router.get('/debug-tokens', authenticateToken, async (req, res) => {
  try {
    const tokenInfo = {
      hasFitbitConnection: !!req.user.fitbitUserId,
      hasTokens: !!req.user.fitbitTokens,
      tokenDetails: req.user.fitbitTokens ? {
        hasAccessToken: !!req.user.fitbitTokens.access_token,
        hasRefreshToken: !!req.user.fitbitTokens.refresh_token,
        hasExpiresAt: !!req.user.fitbitTokens.expires_at,
        expiresAt: req.user.fitbitTokens.expires_at,
        currentTime: Date.now(),
        isExpired: req.user.fitbitTokens.expires_at ? Date.now() > req.user.fitbitTokens.expires_at : null,
        accessTokenPreview: req.user.fitbitTokens.access_token ? 
          req.user.fitbitTokens.access_token.substring(0, 20) + '...' : null
      } : null
    };
    
    res.json(tokenInfo);
  } catch (error) {
    console.error('[Fitbit Routes] Error in debug route:', error);
    res.status(500).json({ error: 'Failed to get token debug info' });
  }
});

// Get daily logs for calories burned
router.get('/logs/calories', authenticateToken, requireFitbitConnection, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 📊 Fetching calories logs for user:', req.user._id);
    
    const { days = 7 } = req.query;
    const daysToFetch = Math.min(parseInt(days), 30); // Limit to 30 days max
    
    const GoalCompletion = require('../models/GoalCompletion');
    const User = require('../models/User');
    
    // Get user to find account creation date
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysToFetch + 1);
    
    // Ensure we don't fetch logs before account creation
    const accountCreationDate = new Date(user.createdAt);
    accountCreationDate.setHours(0, 0, 0, 0);
    
    if (startDate < accountCreationDate) {
      startDate.setTime(accountCreationDate.getTime());
    }
    
    const logs = await GoalCompletion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
    .select('date caloriesBurned goals')
    .sort({ date: -1 })
    .lean();
    
    console.log('[Fitbit Routes] ✅ Calories logs fetched successfully:', logs.length, 'records');
    console.log('[Fitbit Routes] Date range:', { startDate, endDate, accountCreationDate });
    res.json({ logs });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching calories logs:', error);
    res.status(500).json({ error: 'Failed to fetch calories logs' });
  }
});



// Get daily logs for calorie deficit
router.get('/logs/deficit', authenticateToken, requireFitbitConnection, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 📊 Fetching calorie deficit logs for user:', req.user._id);
    
    const { days = 7 } = req.query;
    const daysToFetch = Math.min(parseInt(days), 30); // Limit to 30 days max
    
    const GoalCompletion = require('../models/GoalCompletion');
    const User = require('../models/User');
    
    // Get user to find account creation date
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysToFetch + 1);
    
    // Ensure we don't fetch logs before account creation
    const accountCreationDate = new Date(user.createdAt);
    accountCreationDate.setHours(0, 0, 0, 0);
    
    if (startDate < accountCreationDate) {
      startDate.setTime(accountCreationDate.getTime());
    }
    
    const logs = await GoalCompletion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
    .select('date calorieDeficit goals')
    .sort({ date: -1 })
    .lean();
    
    console.log('[Fitbit Routes] ✅ Calorie deficit logs fetched successfully:', logs.length, 'records');
    console.log('[Fitbit Routes] Date range:', { startDate, endDate, accountCreationDate });
    res.json({ logs });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching calorie deficit logs:', error);
    res.status(500).json({ error: 'Failed to fetch calorie deficit logs' });
  }
});

module.exports = router;