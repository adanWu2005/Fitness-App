const express = require('express');
const router = express.Router();
const fitbitAuthService = require('../services/fitbitAuthService');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// Step 1: Initiate OAuth flow - redirect user to Fitbit
router.get('/login', authenticateToken, (req, res) => {
  try {
    const authUrl = fitbitAuthService.generateAuthUrl();
    res.json({ 
      authUrl,
      message: 'Visit this URL to authorize your Fitbit account'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Step 2: Handle OAuth callback from Fitbit and frontend
router.get('/callback', async (req, res) => {
  try {
    const { code, state, frontend } = req.query;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }
    if (!frontend) {
      // Initial redirect from Fitbit, send to frontend callback page
      const frontendCallback = process.env.FRONTEND_CALLBACK_URL || 'https://fitterjitter.onrender.com/callback.html';
      return res.redirect(`${frontendCallback}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
    }
    // Fetch from frontend: exchange code for tokens and return JSON
    const tokenData = await fitbitAuthService.exchangeCodeForToken(code, state);
    const fitbitUserId = tokenData.user_id;
    const userProfile = await fitbitAuthService.getUserProfile(tokenData.access_token);
    
    // Store tokens and profile in the user document
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    };
    
    const profile = {
      displayName: userProfile.user.displayName,
      fullName: userProfile.user.fullName,
      avatar: userProfile.user.avatar
    };
    
    res.json({
      success: true,
      message: 'Successfully authenticated with Fitbit!',
      fitbitUserId,
      user: {
        id: fitbitUserId,
        displayName: userProfile.user.displayName,
        fullName: userProfile.user.fullName
      },
      tokens,
      profile
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Connect Fitbit to current user
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const { fitbitUserId, tokens, profile } = req.body;
    
    if (!fitbitUserId || !tokens || !profile) {
      return res.status(400).json({ error: 'Missing Fitbit data' });
    }
    
    console.log(`[FitbitAuth] Attempting to connect Fitbit account ${fitbitUserId} to user ${req.user.email}`);
    
    // Check if this Fitbit account is already connected to another user
    const existingUser = await User.findOne({ fitbitUserId });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      console.log(`[FitbitAuth] Fitbit account ${fitbitUserId} is already connected to user ${existingUser.email}`);
      return res.status(400).json({ 
        error: 'This Fitbit account is already connected to another user',
        details: {
          existingUser: existingUser.email,
          currentUser: req.user.email,
          fitbitUserId: fitbitUserId
        }
      });
    }
    
    // If the same user is trying to reconnect, that's fine
    if (existingUser && existingUser._id.toString() === req.user._id.toString()) {
      console.log(`[FitbitAuth] User ${req.user.email} is reconnecting their Fitbit account`);
    }
    
    // Fetch detailed profile data from Fitbit to get height, weight, gender
    let detailedProfile = null;
    try {
      console.log(`[FitbitAuth] Fetching detailed profile data for user ${fitbitUserId}`);
      const fitbitProfile = await fitbitAuthService.getUserProfile(tokens.access_token);
      detailedProfile = {
        height: fitbitProfile.user.height || null,
        weight: fitbitProfile.user.weight || null, // Weight in kg (already in correct format)
        gender: fitbitProfile.user.gender ? fitbitProfile.user.gender.toLowerCase() : null
      };
      console.log(`[FitbitAuth] Fetched profile data:`, detailedProfile);
    } catch (profileError) {
      console.warn(`[FitbitAuth] Could not fetch detailed profile data:`, profileError.message);
      // Continue without profile data if it fails
    }
    
    // Update user with Fitbit connection and profile data
    await req.user.updateFitbitConnection(fitbitUserId, tokens, profile);
    
    // Update user's profile fields if we got the data
    if (detailedProfile) {
      if (detailedProfile.height !== null) req.user.height = detailedProfile.height;
      if (detailedProfile.weight !== null) req.user.weight = detailedProfile.weight;
      if (detailedProfile.gender !== null) req.user.gender = detailedProfile.gender;
      await req.user.save();
    }
    
    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      username: req.user.displayName, // Username is always the display name
      height: req.user.height,
      weight: req.user.weight,
      gender: req.user.gender,
      profilePicture: req.user.profilePicture,
      fitbitConnected: true,
      fitbitProfile: req.user.fitbitProfile,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };
    
    console.log(`[FitbitAuth] Successfully connected Fitbit account ${fitbitUserId} to user ${req.user.email}`);
    
    res.json({
      message: 'Fitbit connected successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error connecting Fitbit:', error);
    res.status(500).json({ error: 'Failed to connect Fitbit' });
  }
});

// Get current user's Fitbit tokens
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    if (!req.user.fitbitUserId || !req.user.fitbitTokens) {
      return res.status(404).json({ error: 'No Fitbit connection found' });
    }

    // Check if token is expired
    if (Date.now() > req.user.fitbitTokens.expires_at) {
      return res.status(401).json({ error: 'Access token has expired' });
    }

    res.json({
      access_token: req.user.fitbitTokens.access_token,
      expires_at: req.user.fitbitTokens.expires_at
    });
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

// Refresh access token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    if (!req.user.fitbitUserId || !req.user.fitbitTokens) {
      return res.status(404).json({ error: 'No Fitbit connection found' });
    }

    // Refresh the token
    const newTokenData = await fitbitAuthService.refreshAccessToken(req.user.fitbitTokens.refresh_token);
    
    // Update stored tokens
    const updatedTokens = {
      access_token: newTokenData.access_token,
      refresh_token: newTokenData.refresh_token,
      expires_at: Date.now() + (newTokenData.expires_in * 1000)
    };
    
    req.user.fitbitTokens = updatedTokens;
    await req.user.save();

    res.json({
      access_token: newTokenData.access_token,
      expires_in: newTokenData.expires_in
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Revoke tokens (logout)
router.post('/revoke', authenticateToken, async (req, res) => {
  try {
    if (!req.user.fitbitUserId || !req.user.fitbitTokens) {
      return res.status(404).json({ error: 'No Fitbit connection found' });
    }

    // Revoke both access and refresh tokens
    await Promise.all([
      fitbitAuthService.revokeToken(req.user.fitbitTokens.access_token, 'access_token'),
      fitbitAuthService.revokeToken(req.user.fitbitTokens.refresh_token, 'refresh_token')
    ]);

    // Remove Fitbit connection from user
    await req.user.removeFitbitConnection();

    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      username: req.user.displayName, // Username is always the display name
      height: req.user.height,
      weight: req.user.weight,
      gender: req.user.gender,
      profilePicture: req.user.profilePicture,
      fitbitConnected: false,
      fitbitProfile: null,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };

    res.json({ 
      message: 'Successfully disconnected from Fitbit',
      user: userResponse
    });
  } catch (error) {
    console.error('Error revoking tokens:', error);
    res.status(500).json({ error: 'Failed to revoke tokens' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user.fitbitUserId || !req.user.fitbitTokens) {
      return res.status(404).json({ error: 'No Fitbit connection found' });
    }

    // Check if token is expired
    if (Date.now() > req.user.fitbitTokens.expires_at) {
      return res.status(401).json({ error: 'Access token has expired' });
    }

    const profile = await fitbitAuthService.getUserProfile(req.user.fitbitTokens.access_token);
    res.json(profile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// List all Fitbit connections (for debugging/admin purposes)
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const usersWithFitbit = await User.find({ 
      fitbitUserId: { $exists: true, $ne: null } 
    }).select('email displayName fitbitUserId fitbitProfile.displayName createdAt');
    
    res.json({
      totalConnections: usersWithFitbit.length,
      connections: usersWithFitbit.map(user => ({
        userId: user._id,
        email: user.email,
        displayName: user.displayName,
        fitbitUserId: user.fitbitUserId,
        fitbitDisplayName: user.fitbitProfile?.displayName,
        connectedAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting Fitbit connections:', error);
    res.status(500).json({ error: 'Failed to get Fitbit connections' });
  }
});

// Force disconnect a specific Fitbit account (for admin purposes)
router.post('/force-disconnect/:fitbitUserId', authenticateToken, async (req, res) => {
  try {
    const { fitbitUserId } = req.params;
    
    const userToDisconnect = await User.findOne({ fitbitUserId });
    if (!userToDisconnect) {
      return res.status(404).json({ error: 'No user found with this Fitbit account' });
    }
    
    // Remove Fitbit connection
    await userToDisconnect.removeFitbitConnection();
    
    res.json({
      message: `Successfully disconnected Fitbit account ${fitbitUserId} from user ${userToDisconnect.email}`,
      disconnectedUser: {
        email: userToDisconnect.email,
        displayName: userToDisconnect.displayName
      }
    });
  } catch (error) {
    console.error('Error force disconnecting Fitbit:', error);
    res.status(500).json({ error: 'Failed to disconnect Fitbit' });
  }
});

// Public endpoint to initiate Fitbit OAuth (no authentication required)
router.get('/login-init', (req, res) => {
  try {
    const authUrl = fitbitAuthService.generateAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Fitbit OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate Fitbit OAuth URL' });
  }
});

module.exports = router; 