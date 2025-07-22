const mongoose = require('mongoose');
const User = require('../models/User');
const GoalCompletion = require('../models/GoalCompletion');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Check and create daily completion records for all users
const checkDailyCompletions = async () => {
  try {
    console.log('Starting daily completion check...');
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    let createdCount = 0;
    let existingCount = 0;
    
    for (const user of users) {
      // Check if we already have a record for today for this user
      const existingCompletion = await GoalCompletion.findOne({
        userId: user._id,
        date: today
      });
      
      if (!existingCompletion) {
        // Create a new record for today with default values
        const completion = new GoalCompletion({
          userId: user._id,
          date: today,
          caloriesBurned: 0,
          steps: 0,
          calorieDeficit: 0,
          caloriesGoalCompleted: false,
          stepsGoalCompleted: false,
          calorieDeficitGoalCompleted: false,
          goals: {
            dailyCaloriesConsumed: user.dailyCaloriesConsumed || 2000,
            dailySteps: user.dailySteps || 10000,
            dailyCalorieDeficit: user.dailyCalorieDeficit || 500
          }
        });
        
        await completion.save();
        createdCount++;
        console.log(`Created daily completion record for user: ${user.email}`);
      } else {
        existingCount++;
      }
    }
    
    console.log(`Daily completion check completed:`);
    console.log(`- Created: ${createdCount} new records`);
    console.log(`- Existing: ${existingCount} records already existed`);
    
  } catch (error) {
    console.error('Error checking daily completions:', error);
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await checkDailyCompletions();
  await mongoose.disconnect();
  console.log('Script completed');
  process.exit(0);
};

// Handle script termination
process.on('SIGINT', async () => {
  console.log('Script interrupted');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Script terminated');
  await mongoose.disconnect();
  process.exit(0);
});

// Run the script
run().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 