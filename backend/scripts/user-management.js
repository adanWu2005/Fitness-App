const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const User = require('../models/User');

async function listAllUsers() {
  try {
    console.log('\n=== All Users Report ===\n');
    
    const users = await User.find({}).select('email displayName fitbitConnected fitbitUserId createdAt lastLogin');
    
    console.log(`Total users: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('No users found in the database.');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.displayName})`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log(`   Last Login: ${user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}`);
      console.log(`   Fitbit Connected: ${user.fitbitConnected ? 'Yes' : 'No'}`);
      if (user.fitbitConnected) {
        console.log(`   Fitbit ID: ${user.fitbitUserId}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function createUser(email, displayName, password) {
  try {
    console.log(`\n=== Creating User: ${email} ===\n`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`❌ User with email ${email} already exists`);
      return;
    }
    
    // Create new user
    const user = new User({
      email,
      displayName,
      password
    });
    
    await user.save();
    
    console.log(`✅ User created successfully:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   ID: ${user._id}`);
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function deleteUser(email) {
  try {
    console.log(`\n=== Deleting User: ${email} ===\n`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    
    console.log(`Found user: ${user.email} (${user.displayName})`);
    console.log(`Fitbit Connected: ${user.fitbitConnected ? 'Yes' : 'No'}`);
    
    // Ask for confirmation (in a real script, you'd use readline)
    console.log('⚠️  This will permanently delete the user and all their data.');
    console.log('To proceed, run: node user-management.js confirm-delete <email>');
    
  } catch (error) {
    console.error('Error finding user:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function confirmDeleteUser(email) {
  try {
    console.log(`\n=== Confirming Deletion of User: ${email} ===\n`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    
    // Delete the user
    await User.findByIdAndDelete(user._id);
    
    console.log(`✅ User ${email} has been permanently deleted`);
    
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function resetUserPassword(email, newPassword) {
  try {
    console.log(`\n=== Resetting Password for User: ${email} ===\n`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    console.log(`✅ Password reset successfully for ${email}`);
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function disconnectUserFitbit(email) {
  try {
    console.log(`\n=== Disconnecting Fitbit for User: ${email} ===\n`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    
    if (!user.fitbitConnected) {
      console.log(`❌ User ${email} is not connected to Fitbit`);
      return;
    }
    
    // Remove Fitbit connection
    await user.removeFitbitConnection();
    
    console.log(`✅ Fitbit disconnected successfully for ${email}`);
    console.log(`   Previous Fitbit ID: ${user.fitbitUserId}`);
    
  } catch (error) {
    console.error('Error disconnecting Fitbit:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'list':
    listAllUsers();
    break;
    
  case 'create':
    const [email, displayName, password] = args.slice(1);
    if (!email || !displayName || !password) {
      console.log('Usage: node user-management.js create <email> <displayName> <password>');
      process.exit(1);
    }
    createUser(email, displayName, password);
    break;
    
  case 'delete':
    const deleteEmail = args[1];
    if (!deleteEmail) {
      console.log('Usage: node user-management.js delete <email>');
      process.exit(1);
    }
    deleteUser(deleteEmail);
    break;
    
  case 'confirm-delete':
    const confirmEmail = args[1];
    if (!confirmEmail) {
      console.log('Usage: node user-management.js confirm-delete <email>');
      process.exit(1);
    }
    confirmDeleteUser(confirmEmail);
    break;
    
  case 'reset-password':
    const [resetEmail, newPassword] = args.slice(1);
    if (!resetEmail || !newPassword) {
      console.log('Usage: node user-management.js reset-password <email> <newPassword>');
      process.exit(1);
    }
    resetUserPassword(resetEmail, newPassword);
    break;
    
  case 'disconnect-fitbit':
    const disconnectEmail = args[1];
    if (!disconnectEmail) {
      console.log('Usage: node user-management.js disconnect-fitbit <email>');
      process.exit(1);
    }
    disconnectUserFitbit(disconnectEmail);
    break;
    
  default:
    console.log('User Management Script');
    console.log('=====================');
    console.log('');
    console.log('Available commands:');
    console.log('  list                    - List all users');
    console.log('  create <email> <name> <password> - Create a new user');
    console.log('  delete <email>          - Delete a user (requires confirmation)');
    console.log('  confirm-delete <email>  - Confirm deletion of a user');
    console.log('  reset-password <email> <password> - Reset user password');
    console.log('  disconnect-fitbit <email> - Disconnect user from Fitbit');
    console.log('');
    console.log('Examples:');
    console.log('  node user-management.js list');
    console.log('  node user-management.js create john@example.com "John Doe" mypassword123');
    console.log('  node user-management.js delete john@example.com');
    console.log('  node user-management.js confirm-delete john@example.com');
    console.log('  node user-management.js reset-password john@example.com newpassword123');
    console.log('  node user-management.js disconnect-fitbit john@example.com');
    break;
} 