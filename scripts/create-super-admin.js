// Script to create a super admin user
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/user.model');

// Default super admin details
const email = process.argv[2] || 'superadmin@malabon.com';
const displayName = process.argv[3] || 'Super Admin';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return createSuperAdmin(email, displayName);
  })
  .then(user => {
    console.log(`Super admin created successfully: ${user.email}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

async function createSuperAdmin(email, displayName) {
  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // Update existing user
      user.isAdmin = true;
      user.isSuperAdmin = true;
      user.displayName = displayName;
      await user.save();
      console.log('Existing user updated with super admin privileges');
      return user;
    }
    
    // Create new super admin user
    user = await User.create({
      email,
      displayName,
      isAdmin: true,
      isSuperAdmin: true,
      photoURL: null
    });
    
    console.log('New super admin user created');
    return user;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
} 