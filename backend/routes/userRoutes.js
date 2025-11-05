const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { isAuthorized, isAdmin, isSuperAdmin, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Simple refresh-token blacklist model (TTL via expiresAt)
const blacklistedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
});
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const BlacklistedToken = mongoose.models.BlacklistedToken || mongoose.model('BlacklistedToken', blacklistedTokenSchema);

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { name, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, password: hashedPassword });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error during registration');
  }
});

// Enhanced Login with Access & Refresh Tokens (supports rememberMe)
router.post('/login', async (req, res) => {
  const { name, password, rememberMe } = req.body;

  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

    user.password = undefined;

    // Create access token (1 year duration)
    const accessToken = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '365d' }
    );

    // Create refresh token (1 year duration)
    const refreshToken = jwt.sign(
      { id: user._id, type: 'refresh' }, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
      { expiresIn: '365d' }
    );

    // Set secure cookies for mobile compatibility
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year for access token
    };

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
    };

    return res
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, refreshCookieOptions)
      .status(200).json({
        success: true,
        user,
        accessToken,
      });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error during login');
  }
});

// Refresh Token Endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token not provided' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token type' 
      });
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check blacklist
    const blacklisted = await BlacklistedToken.findOne({ token: refreshToken });
    if (blacklisted) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token invalidated' 
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '365d' }
    );

    // Set new access token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year for access token
    };

    return res
      .cookie('accessToken', newAccessToken, cookieOptions)
      .status(200).json({
        success: true,
        accessToken: newAccessToken,
        message: 'Token refreshed successfully'
      });

  } catch (error) {
    console.error('Refresh token error:', error);
    // blacklist offending refresh token if present
    const { refreshToken } = req.cookies || {};
    if (refreshToken) {
      try {
        await BlacklistedToken.create({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) });
      } catch {}
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// Enhanced Logout
router.get('/logout', async (req, res) => {
  console.log('Logout request received');
  console.log('Cookies received:', req.cookies);
  
  // Use same cookie options as login for consistency
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 0, // Immediately expire the cookie
    path: '/', // Ensure we clear cookies from root path
  };
  
  console.log('Cookie options for clearing:', cookieOptions);
  
  // blacklist refresh token to prevent reuse
  const { refreshToken } = req.cookies || {};
  if (refreshToken) {
    console.log('Blacklisting refresh token');
    try { await BlacklistedToken.create({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) }); } catch {}
  }
  
  console.log('Clearing cookies...');
  return res
    .cookie('accessToken', '', cookieOptions)
    .cookie('refreshToken', '', cookieOptions)
    .status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
});

// Add POST logout route for consistency
router.post('/logout', async (req, res) => {
  // Use same cookie options as login for consistency
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 0, // Immediately expire the cookie
    path: '/', // Ensure we clear cookies from root path
  };
  
  const { refreshToken } = req.cookies || {};
  if (refreshToken) {
    try { await BlacklistedToken.create({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) }); } catch {}
  }
  
  return res
    .cookie('accessToken', '', cookieOptions)
    .cookie('refreshToken', '', cookieOptions)
    .status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
});

// Token verification endpoint for mobile auth checks
router.get('/verify-token', async (req, res) => {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'No access token provided' 
      });
    }

    // Verify access token
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    
    // Check if token is not a refresh token
    if (decoded.type === 'refresh') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token type' 
      });
    }

    // Get user to ensure they still exist
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
});

// All users

router.get('/all-users', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
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
});
// Update profile
router.put('/update-profile', isAuthorized, async (req, res) => {
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
});
// Update user role (Super Admin only)
router.put('/update-user-role/:userId', isAuthorized, isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (role === undefined || role === null) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }
    // Validate role value
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
    // Prevent super admin from changing their own role
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
});

// Change password
router.put('/change-password', isAuthorized, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validate input
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

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
   
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update username
router.put('/update-username', isAuthorized, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newUsername } = req.body;

    if (!newUsername || newUsername.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ name: newUsername.trim() });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Update username
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
});

module.exports = router;
