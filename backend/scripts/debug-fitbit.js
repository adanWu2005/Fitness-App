const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const User = require('../models/User');

async function debugFitbitConnections() {
  try {
    console.log('\n=== Fitbit Connection Debug Report ===\n');
    
    // Get all users
    const users = await User.find({}).select('email displayName fitbitUserId fitbitConnected fitbitProfile createdAt');
    
    console.log(`Total users in database: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email} (${user.displayName})`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log(`   Fitbit Connected: ${user.fitbitConnected ? 'Yes' : 'No'}`);
      if (user.fitbitConnected) {
        console.log(`   Fitbit User ID: ${user.fitbitUserId}`);
        console.log(`   Fitbit Display Name: ${user.fitbitProfile?.displayName || 'N/A'}`);
        console.log(`   Fitbit Full Name: ${user.fitbitProfile?.fullName || 'N/A'}`);
      }
      console.log('');
    });
    
    // Check for specific user
    const targetUser = await User.findOne({ email: 'kingadan111@gmail.com' });
    if (targetUser) {
      console.log('=== Details for kingadan111@gmail.com ===');
      console.log(`Email: ${targetUser.email}`);
      console.log(`Display Name: ${targetUser.displayName}`);
      console.log(`Fitbit Connected: ${targetUser.fitbitConnected}`);
      console.log(`Fitbit User ID: ${targetUser.fitbitUserId || 'None'}`);
      console.log(`Fitbit Profile: ${JSON.stringify(targetUser.fitbitProfile, null, 2)}`);
      console.log('');
    }
    
    // Check for any Fitbit connections
    const usersWithFitbit = await User.find({ fitbitUserId: { $exists: true, $ne: null } });
    console.log(`Users with Fitbit connections: ${usersWithFitbit.length}`);
    usersWithFitbit.forEach(user => {
      console.log(`- ${user.email}: ${user.fitbitUserId} (${user.fitbitProfile?.displayName})`);
    });
    
  } catch (error) {
    console.error('Error debugging Fitbit connections:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugFitbitConnections(); 