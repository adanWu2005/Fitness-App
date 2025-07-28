const mongoose = require('mongoose');

const goalCompletionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  caloriesGoalCompleted: {
    type: Boolean,
    default: false
  },

  calorieDeficitGoalCompleted: {
    type: Boolean,
    default: false
  },
  caloriesBurned: {
    type: Number,
    default: 0
  },

  calorieDeficit: {
    type: Number,
    default: 0
  },
  goals: {
    dailyCaloriesConsumed: Number,

    dailyCalorieDeficit: Number
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user per day
goalCompletionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('GoalCompletion', goalCompletionSchema); 