const express = require('express');
const User = require('../models/User');
const { authenticateToken, generateToken } = require('../middleware/auth');
const router = express.Router();
const crypto = require('crypto'); // Added for random password generation
const fitbitAuthService = require('../services/fitbitAuthService');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user with default profile values
    const user = new User({
      email,
      password,
      displayName,
      height: 170, // Default height in cm
      weight: 70,  // Default weight in kg
      gender: 'other' // Default gender
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userResponse = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.displayName, // Username is always the display name
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      profilePicture: user.profilePicture,
      fitbitConnected: !!(user.fitbitUserId && user.fitbitTokens),
      fitbitProfile: user.fitbitProfile,
      profileComplete: !!(user.height && user.weight && user.gender),
      createdAt: user.createdAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userResponse = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.displayName, // Username is always the display name
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      profilePicture: user.profilePicture,
      fitbitConnected: !!(user.fitbitUserId && user.fitbitTokens),
      fitbitProfile: user.fitbitProfile,
      profileComplete: !!(user.height && user.weight && user.gender),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login with Fitbit
router.post('/fitbit-login', async (req, res) => {
  try {
    const { fitbitUserId, tokens, profile } = req.body;
    if (!fitbitUserId || !tokens || !profile) {
      return res.status(400).json({ error: 'Missing Fitbit data' });
    }
    // Find user by Fitbit ID
    const user = await User.findOne({ fitbitUserId });
    if (!user) {
      return res.status(404).json({ error: 'No user found for this Fitbit account. Please register.' });
    }
    // Update tokens/profile
    await user.updateFitbitConnection(fitbitUserId, tokens, profile);
    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user._id);
    const userResponse = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.displayName,
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      profilePicture: user.profilePicture,
      fitbitConnected: !!(user.fitbitUserId && user.fitbitTokens),
      fitbitProfile: user.fitbitProfile,
      profileComplete: !!(user.height && user.weight && user.gender),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    res.json({
      message: 'Login with Fitbit successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Fitbit login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register with Fitbit
router.post('/fitbit-register', async (req, res) => {
  try {
    const { fitbitUserId, tokens, profile } = req.body;
    if (!fitbitUserId || !tokens || !profile) {
      return res.status(400).json({ error: 'Missing Fitbit data' });
    }
    // Check if user already exists
    let user = await User.findOne({ fitbitUserId });
    if (user) {
      // If user exists, treat as login
      await user.updateFitbitConnection(fitbitUserId, tokens, profile);
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user with Fitbit info
      user = new User({
        email: `${fitbitUserId}@fitbit.local`, // Placeholder email
        password: crypto.randomBytes(16).toString('hex'), // Random password
        displayName: profile.displayName || 'Fitbit User',
        fitbitUserId,
        fitbitTokens: tokens,
        fitbitProfile: profile,
        height: null,
        weight: null,
        gender: null
      });
      await user.save();
    }
    const token = generateToken(user._id);
    const userResponse = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      username: user.displayName,
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      profilePicture: user.profilePicture,
      fitbitConnected: !!(user.fitbitUserId && user.fitbitTokens),
      fitbitProfile: user.fitbitProfile,
      profileComplete: !!(user.height && user.weight && user.gender),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    res.json({
      message: 'Registration with Fitbit successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Fitbit register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      username: req.user.displayName, // Username is always the display name
      height: req.user.height,
      weight: req.user.weight,
      gender: req.user.gender,
      profilePicture: req.user.profilePicture,
      fitbitConnected: !!(req.user.fitbitUserId && req.user.fitbitTokens),
      fitbitProfile: req.user.fitbitProfile,
      profileComplete: !!(req.user.height && req.user.weight && req.user.gender),
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { height, weight, gender, profilePicture, dailyCaloriesConsumed, dailyCalorieDeficit } = req.body;

    // Update allowed fields (username is not editable)
    if (height !== undefined) req.user.height = height;
    if (weight !== undefined) req.user.weight = weight;
    if (gender !== undefined) req.user.gender = gender;
    if (profilePicture !== undefined) req.user.profilePicture = profilePicture;
    if (dailyCaloriesConsumed !== undefined) req.user.dailyCaloriesConsumed = dailyCaloriesConsumed;
    
    if (dailyCalorieDeficit !== undefined) req.user.dailyCalorieDeficit = dailyCalorieDeficit;

    await req.user.save();

    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      username: req.user.displayName, // Username is always the display name
      height: req.user.height,
      weight: req.user.weight,
      gender: req.user.gender,
      profilePicture: req.user.profilePicture,
      fitbitConnected: !!(req.user.fitbitUserId && req.user.fitbitTokens),
      fitbitProfile: req.user.fitbitProfile,
      profileComplete: !!(req.user.height && req.user.weight && req.user.gender),
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect Fitbit
router.post('/disconnect-fitbit', authenticateToken, async (req, res) => {
  try {
    await req.user.removeFitbitConnection();
    
    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      fitbitConnected: false,
      fitbitProfile: null,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };

    res.json({
      message: 'Fitbit disconnected successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Disconnect Fitbit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    console.log(`[Auth] Deleting account for user: ${req.user.email}`);
    
    // If user has Fitbit connected, revoke tokens first
    if (req.user.fitbitUserId && req.user.fitbitTokens) {
      try {
        const fitbitAuthService = require('../services/fitbitAuthService');
        await Promise.all([
          fitbitAuthService.revokeToken(req.user.fitbitTokens.access_token, 'access_token'),
          fitbitAuthService.revokeToken(req.user.fitbitTokens.refresh_token, 'refresh_token')
        ]);
        console.log(`[Auth] Successfully revoked Fitbit tokens for user: ${req.user.email}`);
      } catch (revokeError) {
        console.warn(`[Auth] Could not revoke Fitbit tokens:`, revokeError.message);
        // Continue with account deletion even if token revocation fails
      }
    }
    
    // Delete all GoalCompletion records for this user
    const GoalCompletion = require('../models/GoalCompletion');
    await GoalCompletion.deleteMany({ userId: req.user._id });
    console.log(`[Auth] Deleted GoalCompletion records for user: ${req.user.email}`);
    
    // Delete in-memory meals data
    const mealsService = require('../services/mealsService');
    if (mealsService.userMealFolders && mealsService.userMealFolders.has(req.user._id.toString())) {
      mealsService.userMealFolders.delete(req.user._id.toString());
      console.log(`[Auth] Deleted meals data for user: ${req.user.email}`);
    }
    
    // Delete in-memory workouts data
    const workoutsService = require('../services/workoutsService');
    if (workoutsService.userFolders && workoutsService.userFolders.has(req.user._id.toString())) {
      workoutsService.userFolders.delete(req.user._id.toString());
      console.log(`[Auth] Deleted workouts data for user: ${req.user.email}`);
    }
    
    // Delete uploaded images for this user
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        // For now, we'll delete all uploaded images since they're not user-specific
        // In a production system, you might want to track which images belong to which user
        const filePath = path.join(uploadsDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`[Auth] Deleted uploaded file: ${file}`);
        } catch (fileError) {
          console.warn(`[Auth] Could not delete file ${file}:`, fileError.message);
        }
      }
    }
    
    // Delete the user from database
    await User.findByIdAndDelete(req.user._id);
    
    console.log(`[Auth] Successfully deleted account for user: ${req.user.email}`);
    
    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 