const mongoose = require('mongoose');
const User = require('../models/User');
const { SessionService } = require('../services/redisService');

// @route GET /api/all-users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error while fetching users');
  }
};

// @route PUT /api/update-profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, address, city } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.city = city || user.city;

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route POST /api/kill-all-sessions/:userId
// @desc Kill all sessions for a user (Admin only)
const killAllSessions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await SessionService.killAllSessions(userId);

    return res.status(200).json({
      success: true,
      message: 'All sessions killed successfully'
    });
  } catch (error) {
    console.error('Kill all sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route PUT /api/update-user-role/:userId
// @desc Update user role (Super Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (role === undefined || role === null) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }
    if (![0, 1, 2].includes(parseInt(role))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role value. Must be 0 (User), 1 (Admin), or 2 (Super Admin)'
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (req.user.id === userId && req.user.role === 2) {
      return res.status(403).json({
        success: false,
        message: 'Super admin cannot change their own role'
      });
    }
    user.role = parseInt(role);
    const updatedUser = await user.save();
    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
      },
    });
  } catch (error) {
    console.error('Update User Role Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route PUT /api/change-password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isOldPasswordValid = await user.comparePassword(oldPassword);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    user.password = newPassword; // pre-save hook hashes this
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route PUT /api/update-username
const updateUsername = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newUsername } = req.body;

    if (!newUsername || newUsername.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    const existingUser = await User.findOne({ name: newUsername.trim() });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.name = newUsername.trim();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Username updated successfully',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
      }
    });
  } catch (error) {
    console.error('Update Username Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllUsers,
  updateProfile,
  killAllSessions,
  updateUserRole,
  changePassword,
  updateUsername,
};
