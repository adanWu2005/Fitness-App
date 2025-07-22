const express = require('express');
const router = express.Router();
const fitbitService = require('../services/fitbitService');
const { authenticateToken, requireFitbitConnection } = require('../middleware/auth');
const { refreshTokenIfNeeded, withTokenRefresh, isTokenExpiredError } = require('../middleware/tokenRefresh');

// Get today's steps
router.get('/steps', authenticateToken, requireFitbitConnection, refreshTokenIfNeeded, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 📊 Fetching steps for user:', req.user._id);
    
    // Double-check that we have valid tokens after refresh
    if (!req.user.fitbitTokens || !req.user.fitbitTokens.access_token) {
      console.error('[Fitbit Routes] No valid access token after refresh');
      return res.status(401).json({ 
        error: 'No valid Fitbit access token. Please reconnect your Fitbit account.' 
      });
    }
    
    const steps = await fitbitService.getTodaysSteps(req.user.fitbitTokens.access_token);
    console.log('[Fitbit Routes] ✅ Steps fetched successfully:', steps);
    res.json({ steps });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching steps:', error);
    
    // Check if it's a token expiration error
    if (isTokenExpiredError(error)) {
      return res.status(401).json({ 
        error: 'Fitbit token expired. Please reconnect your Fitbit account.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch steps data' });
  }
});

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

// Get both steps and calories in one call
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
    
    const [steps, calories] = await Promise.all([
      fitbitService.getTodaysSteps(req.user.fitbitTokens.access_token),
      fitbitService.getTodaysCalories(req.user.fitbitTokens.access_token)
    ]);
    console.log('[Fitbit Routes] ✅ Activity data fetched successfully - Steps:', steps, 'Calories:', calories);
    res.json({ steps, calories });
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysToFetch + 1);
    
    const logs = await GoalCompletion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
    .select('date caloriesBurned goals')
    .sort({ date: -1 })
    .lean();
    
    console.log('[Fitbit Routes] ✅ Calories logs fetched successfully:', logs.length, 'records');
    res.json({ logs });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching calories logs:', error);
    res.status(500).json({ error: 'Failed to fetch calories logs' });
  }
});

// Get daily logs for steps
router.get('/logs/steps', authenticateToken, requireFitbitConnection, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 📊 Fetching steps logs for user:', req.user._id);
    
    const { days = 7 } = req.query;
    const daysToFetch = Math.min(parseInt(days), 30); // Limit to 30 days max
    
    const GoalCompletion = require('../models/GoalCompletion');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysToFetch + 1);
    
    const logs = await GoalCompletion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
    .select('date steps goals')
    .sort({ date: -1 })
    .lean();
    
    console.log('[Fitbit Routes] ✅ Steps logs fetched successfully:', logs.length, 'records');
    res.json({ logs });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching steps logs:', error);
    res.status(500).json({ error: 'Failed to fetch steps logs' });
  }
});

// Get daily logs for calorie deficit
router.get('/logs/deficit', authenticateToken, requireFitbitConnection, async (req, res) => {
  try {
    console.log('[Fitbit Routes] 📊 Fetching calorie deficit logs for user:', req.user._id);
    
    const { days = 7 } = req.query;
    const daysToFetch = Math.min(parseInt(days), 30); // Limit to 30 days max
    
    const GoalCompletion = require('../models/GoalCompletion');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysToFetch + 1);
    
    const logs = await GoalCompletion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    })
    .select('date calorieDeficit goals')
    .sort({ date: -1 })
    .lean();
    
    console.log('[Fitbit Routes] ✅ Calorie deficit logs fetched successfully:', logs.length, 'records');
    res.json({ logs });
  } catch (error) {
    console.error('[Fitbit Routes] ❌ Error fetching calorie deficit logs:', error);
    res.status(500).json({ error: 'Failed to fetch calorie deficit logs' });
  }
});

module.exports = router;