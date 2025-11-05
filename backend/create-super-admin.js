const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 2 });
    if (existingSuperAdmin) {
      console.log('Super Admin already exists:', existingSuperAdmin.name);
      return;
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superAdmin = await User.create({
      name: 'superadmin',
      password: hashedPassword,
      role: 2, // Super Admin role
      address: 'Admin Address',
      city: 'Admin City',
      phone: '1234567890'
    });

    console.log('Super Admin created successfully:', {
      name: superAdmin.name,
      role: superAdmin.role,
      id: superAdmin._id
    });
    console.log('Default password: admin123');
    console.log('Please change the password after first login!');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createSuperAdmin();
