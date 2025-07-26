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

// Recalculate goal completions with new 200-calorie threshold logic
const recalculateGoalCompletions = async () => {
  try {
    console.log('Starting goal completion recalculation...');
    
    // Get all goal completions
    const completions = await GoalCompletion.find({});
    console.log(`Found ${completions.length} completion records`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    
    for (const completion of completions) {
      let needsUpdate = false;
      
      // Recalculate calorie deficit goal completion with new logic
      if (completion.goals && completion.goals.dailyCalorieDeficit) {
        const oldValue = completion.calorieDeficitGoalCompleted;
        const goalDiff = Math.abs(completion.calorieDeficit - completion.goals.dailyCalorieDeficit);
        const newValue = goalDiff <= 200;
        
        if (oldValue !== newValue) {
          completion.calorieDeficitGoalCompleted = newValue;
          needsUpdate = true;
          console.log(`User ${completion.userId}, Date ${completion.date}: Calorie deficit goal changed from ${oldValue} to ${newValue} (deficit: ${completion.calorieDeficit}, goal: ${completion.goals.dailyCalorieDeficit}, diff: ${goalDiff})`);
        }
      }
      
      if (needsUpdate) {
        await completion.save();
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }
    
    console.log(`Goal completion recalculation completed:`);
    console.log(`- Updated: ${updatedCount} records`);
    console.log(`- Unchanged: ${unchangedCount} records`);
    
  } catch (error) {
    console.error('Error recalculating goal completions:', error);
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await recalculateGoalCompletions();
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