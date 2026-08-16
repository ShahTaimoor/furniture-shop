const userModel = require('../models/postgres/userModel');
const { SessionService } = require('../services/redisService');

// @route GET /api/pg/all-users
const getAllUsers = async (req, res) => {
  try {
    const rows = await userModel.list();
    const users = rows.map((row) => {
      const user = userModel.rowToUser(row);
      return user;
    });
    res.status(200).json({ success: true, users, total: users.length });
  } catch (error) {
    console.error('pg getAllUsers error:', error);
    res.status(500).send('Server error while fetching users');
  }
};

// @route PUT /api/pg/update-profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, city } = req.body;
    const row = await userModel.updateById(req.user.id, { name, phone, address, city });
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });

    const user = userModel.rowToUser(row);
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: { id: user._id, name: user.name, phone: user.phone, address: user.address, city: user.city },
    });
  } catch (error) {
    console.error('pg Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route POST /api/pg/kill-all-sessions/:userId
const killAllSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const row = await userModel.findById(userId);
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });

    await SessionService.killAllSessions(userId);
    return res.status(200).json({ success: true, message: 'All sessions killed successfully' });
  } catch (error) {
    console.error('pg Kill all sessions error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route PUT /api/pg/update-user-role/:userId
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (role === undefined || role === null) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }
    if (![0, 1, 2].includes(parseInt(role, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid role value. Must be 0 (User), 1 (Admin), or 2 (Super Admin)' });
    }

    const existing = await userModel.findById(userId);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user.id === userId && req.user.role === 2) {
      return res.status(403).json({ success: false, message: 'Super admin cannot change their own role' });
    }

    const row = await userModel.updateById(userId, { role: parseInt(role, 10) });
    const user = userModel.rowToUser(row);

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: { id: user._id, name: user.name, role: user.role, phone: user.phone, address: user.address, city: user.city },
    });
  } catch (error) {
    console.error('pg Update User Role Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route PUT /api/pg/change-password
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const row = await userModel.findById(req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });

    const isOldPasswordValid = await userModel.comparePassword(oldPassword, row.password_hash);
    if (!isOldPasswordValid) {
      return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    await userModel.updatePassword(req.user.id, newPassword);
    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('pg Change Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route PUT /api/pg/update-username (updates display name; login is by email now)
const updateUsername = async (req, res) => {
  try {
    const { newUsername } = req.body;
    if (!newUsername || newUsername.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const row = await userModel.updateById(req.user.id, { name: newUsername.trim() });
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });

    const user = userModel.rowToUser(row);
    return res.status(200).json({
      success: true,
      message: 'Name updated successfully',
      user: { id: user._id, name: user.name, role: user.role, phone: user.phone, address: user.address, city: user.city },
    });
  } catch (error) {
    console.error('pg Update Username Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
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
