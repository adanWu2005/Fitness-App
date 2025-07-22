const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const User = require('../models/User');

async function checkFitbitConnections() {
  try {
    console.log('\n=== Fitbit Connections Report ===\n');
    
    // Get all users with Fitbit connections
    const usersWithFitbit = await User.find({ 
      fitbitUserId: { $exists: true, $ne: null } 
    }).select('email displayName fitbitUserId fitbitProfile createdAt');
    
    console.log(`Total users with Fitbit connections: ${usersWithFitbit.length}\n`);
    
    if (usersWithFitbit.length === 0) {
      console.log('No Fitbit connections found in the database.');
      return;
    }
    
    // Display each connection
    usersWithFitbit.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email} (${user.displayName})`);
      console.log(`   Fitbit User ID: ${user.fitbitUserId}`);
      console.log(`   Fitbit Display Name: ${user.fitbitProfile?.displayName || 'N/A'}`);
      console.log(`   Connected: ${user.createdAt.toLocaleDateString()}`);
      console.log('');
    });
    
    // Check for duplicate Fitbit accounts
    const fitbitUserIds = usersWithFitbit.map(user => user.fitbitUserId);
    const uniqueFitbitIds = [...new Set(fitbitUserIds)];
    
    if (fitbitUserIds.length !== uniqueFitbitIds.length) {
      console.log('⚠️  WARNING: Duplicate Fitbit accounts detected!');
      console.log('This means multiple users are connected to the same Fitbit account.\n');
      
      // Find duplicates
      const duplicates = fitbitUserIds.filter((id, index) => fitbitUserIds.indexOf(id) !== index);
      const uniqueDuplicates = [...new Set(duplicates)];
      
      uniqueDuplicates.forEach(fitbitId => {
        const usersWithThisFitbit = usersWithFitbit.filter(user => user.fitbitUserId === fitbitId);
        console.log(`Fitbit ID ${fitbitId} is connected to:`);
        usersWithThisFitbit.forEach(user => {
          console.log(`  - ${user.email} (${user.displayName})`);
        });
        console.log('');
      });
    } else {
      console.log('✅ All Fitbit connections are unique (no duplicates found).');
    }
    
  } catch (error) {
    console.error('Error checking Fitbit connections:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function disconnectFitbitAccount(fitbitUserId) {
  try {
    console.log(`\n=== Disconnecting Fitbit Account: ${fitbitUserId} ===\n`);
    
    const user = await User.findOne({ fitbitUserId });
    if (!user) {
      console.log(`❌ No user found with Fitbit ID: ${fitbitUserId}`);
      return;
    }
    
    console.log(`Found user: ${user.email} (${user.displayName})`);
    console.log('Disconnecting...');
    
    await user.removeFitbitConnection();
    
    console.log(`✅ Successfully disconnected Fitbit account from ${user.email}`);
    
  } catch (error) {
    console.error('Error disconnecting Fitbit account:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === 'disconnect') {
  const fitbitUserId = args[1];
  if (!fitbitUserId) {
    console.log('Usage: node check-fitbit-connections.js disconnect <fitbit_user_id>');
    process.exit(1);
  }
  disconnectFitbitAccount(fitbitUserId);
} else {
  checkFitbitConnections();
} 