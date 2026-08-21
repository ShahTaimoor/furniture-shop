const jwt = require('jsonwebtoken');
const userModel = require('../models/postgres/userModel');
const { TokenStore, SessionService } = require('../services/redisService');
const { getAuthCookieNames } = require('../utils/authCookies');

const accessCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 365 * 24 * 60 * 60 * 1000,
});

const refreshCookieOptions = (rememberMe) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
});

const emailRegex = /^\S+@\S+\.\S+$/;

// @route POST /api/pg/signup
const signup = async (req, res) => {
  const { name, email, password } = req.body || {};

  try {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'A valid email is required' });
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const row = await userModel.create({ name: normalizedName, email: normalizedEmail, password: trimmedPassword });
    const user = userModel.rowToUser(row);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('pg Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @route POST /api/pg/login
const login = async (req, res) => {
  const { email, password, rememberMe } = req.body || {};

  try {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const plainPassword = typeof password === 'string' ? password : '';

    if (!normalizedEmail || !plainPassword) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const row = await userModel.findByEmail(normalizedEmail);
    if (!row) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await userModel.comparePassword(plainPassword, row.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    await userModel.updateById(row.id, { lastLogin: new Date() });
    const user = userModel.rowToUser(row);

    const safeUser = { id: user._id, name: user.name, email: user.email, role: user.role };

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '365d' });
    const refreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const refreshTokenTTL = (rememberMe ? 30 : 7) * 24 * 60 * 60;
    await TokenStore.storeRefreshToken(user._id.toString(), refreshToken, refreshTokenTTL);

    const fingerprint = SessionService.generateFingerprint(req);
    await SessionService.storeSession(user._id.toString(), refreshToken, fingerprint, refreshTokenTTL);

    const { access: accessCookieName, refresh: refreshCookieName } = getAuthCookieNames(req.headers.origin);

    return res
      .cookie(accessCookieName, accessToken, accessCookieOptions())
      .cookie(refreshCookieName, refreshToken, refreshCookieOptions(rememberMe))
      .status(200)
      .json({ success: true, user: safeUser, accessToken });
  } catch (error) {
    console.error('pg Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @route POST /api/pg/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { access: accessCookieName, refresh: refreshCookieName } = getAuthCookieNames(req.headers.origin);
    const incomingRefreshToken = req.cookies[refreshCookieName];

    if (!incomingRefreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not provided' });
    }

    const isBlocked = await SessionService.isTokenBlocked(incomingRefreshToken);
    if (isBlocked) {
      return res.status(401).json({ success: false, message: 'Refresh token has been revoked' });
    }

    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const row = await userModel.findById(decoded.id);
    if (!row) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const user = userModel.rowToUser(row);

    const isValid = await TokenStore.isValidRefreshToken(user._id.toString(), incomingRefreshToken);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Refresh token invalidated' });
    }

    const fingerprint = SessionService.generateFingerprint(req);
    const sessionValidation = await SessionService.validateSession(user._id.toString(), incomingRefreshToken, fingerprint);
    if (!sessionValidation.valid) {
      return res.status(401).json({ success: false, message: sessionValidation.reason || 'Session validation failed' });
    }

    const newAccessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '365d' });
    const newRefreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    const refreshTokenTTL = 30 * 24 * 60 * 60;
    await TokenStore.rotateRefreshToken(user._id.toString(), incomingRefreshToken, newRefreshToken, refreshTokenTTL);
    await SessionService.removeSession(user._id.toString(), incomingRefreshToken);
    await SessionService.storeSession(user._id.toString(), newRefreshToken, fingerprint, refreshTokenTTL);

    return res
      .cookie(accessCookieName, newAccessToken, accessCookieOptions())
      .cookie(refreshCookieName, newRefreshToken, { ...refreshCookieOptions(false), maxAge: 30 * 24 * 60 * 60 * 1000 })
      .status(200)
      .json({ success: true, accessToken: newAccessToken, message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('pg Refresh token error:', error);
    const { refresh: refreshCookieNameForCleanup } = getAuthCookieNames(req.headers.origin);
    const incomingRefreshToken = (req.cookies || {})[refreshCookieNameForCleanup];
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
  const { access: accessCookieName, refresh: refreshCookieName } = getAuthCookieNames(req.headers.origin);

  const incomingRefreshToken = (req.cookies || {})[refreshCookieName];
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
    .cookie(accessCookieName, '', cookieOptions)
    .cookie(refreshCookieName, '', cookieOptions)
    .status(200)
    .json({ success: true, message: 'Logged out successfully' });
};

// @route GET /api/pg/logout
const logout = (req, res) => performLogout(req, res);
// @route POST /api/pg/logout
const logoutPost = (req, res) => performLogout(req, res);

// @route GET /api/pg/verify-token
const verifyToken = async (req, res) => {
  try {
    const { access: accessCookieName } = getAuthCookieNames(req.headers.origin);
    const accessToken = req.cookies[accessCookieName];
    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'No access token provided' });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    if (decoded.type === 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const row = await userModel.findById(decoded.id);
    if (!row) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const user = userModel.rowToUser(row);

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('pg Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
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
