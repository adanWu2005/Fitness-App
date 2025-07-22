const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  height: {
    type: Number,
    min: 0
  },
  weight: {
    type: Number,
    min: 0
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  profilePicture: {
    type: String
  },
  fitbitUserId: {
    type: String,
    unique: true,
    sparse: true
  },
  fitbitTokens: {
    access_token: String,
    refresh_token: String,
    expires_at: Number
  },
  fitbitProfile: {
    displayName: String,
    fullName: String,
    avatar: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  profileComplete: {
    type: Boolean,
    default: false
  },
  dailyCaloriesConsumed: {
    type: Number,
    default: 2000
  },
  dailySteps: {
    type: Number,
    default: 10000
  },
  dailyCalorieDeficit: {
    type: Number,
    default: 500
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update Fitbit connection
userSchema.methods.updateFitbitConnection = function(fitbitUserId, tokens, profile) {
  this.fitbitUserId = fitbitUserId;
  this.fitbitTokens = tokens;
  this.fitbitProfile = profile;
  return this.save();
};

// Method to remove Fitbit connection
userSchema.methods.removeFitbitConnection = function() {
  this.fitbitUserId = undefined;
  this.fitbitTokens = undefined;
  this.fitbitProfile = undefined;
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 