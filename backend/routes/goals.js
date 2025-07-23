const express = require('express');
const router = express.Router();
const GoalCompletion = require('../models/GoalCompletion');
const User = require('../models/User');
const { authenticateToken: auth } = require('../middleware/auth');

// Get goal completion statistics for a user
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user to find account creation date
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculate days since account creation
    const accountCreationDate = new Date(user.createdAt);
    const today = new Date();
    
    // Set both dates to start of day for accurate day counting
    accountCreationDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Calculate total days since account creation
    const timeDiff = today.getTime() - accountCreationDate.getTime();
    const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24)); // Don't add 1 - we want actual days since creation
    
    // If account was created today, show 0/0 for all stats
    if (totalDays === 0) {
      return res.json({
        totalDays: 0, // Show as 0 days for display purposes
        caloriesGoalCompleted: 0,
        stepsGoalCompleted: 0,
        calorieDeficitGoalCompleted: 0,
        caloriesCompletionRate: 0,
        stepsCompletionRate: 0,
        calorieDeficitCompletionRate: 0,
        accountCreatedToday: true
      });
    }
    
    // Get all goal completions for this user
    const completions = await GoalCompletion.find({ userId })
      .sort({ date: -1 })
      .lean();
    
    // Count completed goals
    const caloriesGoalCompleted = completions.filter(c => c.caloriesGoalCompleted).length;
    const stepsGoalCompleted = completions.filter(c => c.stepsGoalCompleted).length;
    const calorieDeficitGoalCompleted = completions.filter(c => c.calorieDeficitGoalCompleted).length;
    
    const stats = {
      totalDays,
      caloriesGoalCompleted,
      stepsGoalCompleted,
      calorieDeficitGoalCompleted,
      caloriesCompletionRate: totalDays > 0 ? (caloriesGoalCompleted / totalDays) * 100 : 0,
      stepsCompletionRate: totalDays > 0 ? (stepsGoalCompleted / totalDays) * 100 : 0,
      calorieDeficitCompletionRate: totalDays > 0 ? (calorieDeficitGoalCompleted / totalDays) * 100 : 0,
      accountCreatedToday: false
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching goal stats:', error);
    res.status(500).json({ error: 'Failed to fetch goal statistics' });
  }
});

// Update or create goal completion for today
router.post('/complete', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { caloriesBurned, steps, calorieDeficit, goals } = req.body;
    
    // Get today's date (start of day)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Check if we already have a record for today
    let completion = await GoalCompletion.findOne({ 
      userId, 
      date: today 
    });
    
    if (!completion) {
      // Create new record for today
      completion = new GoalCompletion({
        userId,
        date: today,
        caloriesBurned: caloriesBurned || 0,
        steps: steps || 0,
        calorieDeficit: calorieDeficit || 0,
        goals: goals || {}
      });
    } else {
      // Update existing record
      completion.caloriesBurned = caloriesBurned || completion.caloriesBurned;
      completion.steps = steps || completion.steps;
      completion.calorieDeficit = calorieDeficit || completion.calorieDeficit;
      completion.goals = goals || completion.goals;
    }
    
    // Determine if goals were completed
    if (completion.goals.dailyCaloriesConsumed) {
      completion.caloriesGoalCompleted = completion.caloriesBurned >= completion.goals.dailyCaloriesConsumed;
    }
    
    if (completion.goals.dailySteps) {
      completion.stepsGoalCompleted = completion.steps >= completion.goals.dailySteps;
    }
    
    if (completion.goals.dailyCalorieDeficit) {
      completion.calorieDeficitGoalCompleted = completion.calorieDeficit >= completion.goals.dailyCalorieDeficit;
    }
    
    await completion.save();
    
    res.json({
      message: 'Goal completion updated successfully',
      completion: {
        caloriesGoalCompleted: completion.caloriesGoalCompleted,
        stepsGoalCompleted: completion.stepsGoalCompleted,
        calorieDeficitGoalCompleted: completion.calorieDeficitGoalCompleted
      }
    });
  } catch (error) {
    console.error('Error updating goal completion:', error);
    res.status(500).json({ error: 'Failed to update goal completion' });
  }
});

// Get recent goal completions (last 7 days)
router.get('/recent', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCompletions = await GoalCompletion.find({
      userId,
      date: { $gte: sevenDaysAgo }
    })
    .sort({ date: -1 })
    .lean();
    
    res.json(recentCompletions);
  } catch (error) {
    console.error('Error fetching recent goal completions:', error);
    res.status(500).json({ error: 'Failed to fetch recent goal completions' });
  }
});

// Check and update daily goal completions (called at midnight)
router.post('/check-daily-completion', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get today's date (start of day)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Check if we already have a record for today
    let completion = await GoalCompletion.findOne({ 
      userId, 
      date: today 
    });
    
    if (!completion) {
      // Create a new record for today with default values
      // This ensures the day is counted in stats even if no goals were met
      completion = new GoalCompletion({
        userId,
        date: today,
        caloriesBurned: 0,
        steps: 0,
        calorieDeficit: 0,
        caloriesGoalCompleted: false,
        stepsGoalCompleted: false,
        calorieDeficitGoalCompleted: false,
        goals: {}
      });
      
      await completion.save();
    }
    
    res.json({
      message: 'Daily completion record checked/created',
      completion: {
        date: completion.date,
        caloriesGoalCompleted: completion.caloriesGoalCompleted,
        stepsGoalCompleted: completion.stepsGoalCompleted,
        calorieDeficitGoalCompleted: completion.calorieDeficitGoalCompleted
      }
    });
  } catch (error) {
    console.error('Error checking daily completion:', error);
    res.status(500).json({ error: 'Failed to check daily completion' });
  }
});

module.exports = router; 