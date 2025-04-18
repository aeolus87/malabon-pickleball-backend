// Script to make a user an admin by email
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/user.model');

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.log('Usage: node make-admin.js <email>');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return makeAdmin(email);
  })
  .then(() => {
    console.log(`User ${email} has been made an admin`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

async function makeAdmin(email) {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }
  
  user.isAdmin = true;
  await user.save();
  
  return user;
} 