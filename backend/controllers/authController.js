const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { TokenStore, SessionService } = require('../services/redisService');

const accessCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year for access token
});

const refreshCookieOptions = (rememberMe) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
});

// @route POST /api/signup
const signup = async (req, res) => {
  const { name, password } = req.body || {};

  try {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';

    if (!normalizedName || normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 2 characters long',
      });
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ name: normalizedName });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists. Please choose another one.',
      });
    }

    const user = await User.create({ name: normalizedName, password: trimmedPassword });
    const safeUser = {
      id: user._id,
      name: user.name,
      role: user.role,
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: safeUser,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @route POST /api/login
// @desc Login with access & refresh tokens (supports rememberMe)
const login = async (req, res) => {
  const { name, password, rememberMe } = req.body || {};

  try {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const plainPassword = typeof password === 'string' ? password : '';

    if (!normalizedName || !plainPassword) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ name: normalizedName }).select('+password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(plainPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    user.loginAttempts = 0;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const safeUser = {
      id: user._id,
      name: user.name,
      role: user.role,
    };

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const refreshTokenTTL = (rememberMe ? 30 : 7) * 24 * 60 * 60; // 30 days or 7 days
    await TokenStore.storeRefreshToken(user._id.toString(), refreshToken, refreshTokenTTL);

    const fingerprint = SessionService.generateFingerprint(req);
    await SessionService.storeSession(user._id.toString(), refreshToken, fingerprint, refreshTokenTTL);

    return res
      .cookie('accessToken', accessToken, accessCookieOptions())
      .cookie('refreshToken', refreshToken, refreshCookieOptions(rememberMe))
      .status(200).json({
        success: true,
        user: safeUser,
        accessToken,
      });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @route POST /api/refresh-token
// @desc Refresh token endpoint with token rotation
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: incomingRefreshToken } = req.cookies;

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    const isBlocked = await SessionService.isTokenBlocked(incomingRefreshToken);
    if (isBlocked) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }

    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValid = await TokenStore.isValidRefreshToken(user._id.toString(), incomingRefreshToken);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalidated'
      });
    }

    const fingerprint = SessionService.generateFingerprint(req);
    const sessionValidation = await SessionService.validateSession(
      user._id.toString(),
      incomingRefreshToken,
      fingerprint
    );

    if (!sessionValidation.valid) {
      return res.status(401).json({
        success: false,
        message: sessionValidation.reason || 'Session validation failed'
      });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const refreshTokenTTL = 30 * 24 * 60 * 60; // 30 days
    await TokenStore.rotateRefreshToken(
      user._id.toString(),
      incomingRefreshToken,
      newRefreshToken,
      refreshTokenTTL
    );

    await SessionService.removeSession(user._id.toString(), incomingRefreshToken);
    await SessionService.storeSession(user._id.toString(), newRefreshToken, fingerprint, refreshTokenTTL);

    return res
      .cookie('accessToken', newAccessToken, accessCookieOptions())
      .cookie('refreshToken', newRefreshToken, { ...refreshCookieOptions(false), maxAge: 30 * 24 * 60 * 60 * 1000 })
      .status(200).json({
        success: true,
        accessToken: newAccessToken,
        message: 'Token refreshed successfully'
      });
  } catch (error) {
    console.error('Refresh token error:', error);
    const { refreshToken: incomingRefreshToken } = req.cookies || {};
    if (incomingRefreshToken) {
      try {
        const decoded = jwt.decode(incomingRefreshToken);
        if (decoded && decoded.id) {
          await SessionService.blockToken(decoded.id.toString(), incomingRefreshToken);
        }
      } catch {}
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

const clearAuthCookies = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 0,
  path: '/',
});

const performLogout = async (req, res) => {
  const cookieOptions = clearAuthCookies();

  const { refreshToken: incomingRefreshToken } = req.cookies || {};
  if (incomingRefreshToken) {
    try {
      const decoded = jwt.decode(incomingRefreshToken);
      if (decoded && decoded.id) {
        const userId = decoded.id.toString();
        await TokenStore.removeRefreshToken(userId, incomingRefreshToken);
        await SessionService.removeSession(userId, incomingRefreshToken);
      }
    } catch (error) {
      console.error('Error removing token/session:', error);
    }
  }

  return res
    .cookie('accessToken', '', cookieOptions)
    .cookie('refreshToken', '', cookieOptions)
    .status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
};

// @route GET /api/logout
const logout = (req, res) => performLogout(req, res);

// @route POST /api/logout
const logoutPost = (req, res) => performLogout(req, res);

// @route GET /api/verify-token
// @desc Token verification endpoint for mobile auth checks
const verifyToken = async (req, res) => {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided'
      });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    if (decoded.type === 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

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
};

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  logoutPost,
  verifyToken,
};
