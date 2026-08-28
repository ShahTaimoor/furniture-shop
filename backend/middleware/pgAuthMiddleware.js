const jwt = require('jsonwebtoken');
const userModel = require('../models/postgres/userModel');
const { getAuthCookieNames } = require('../utils/authCookies');

// Same contract as the Mongo isAuthorized — req.user ends up with the same shape
// (_id, id, role, email, name, ...) so every existing bridge controller that reads
// req.user._id / req.user.id / req.user.role keeps working unchanged.
const isAuthorized = async (req, res, next) => {
  try {
    const { access: accessCookieName } = getAuthCookieNames(req.headers.origin);
    const accessToken = req.cookies[accessCookieName];

    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Access token not provided. Please log in first.' });
    }

    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);

    if (decodedToken.type === 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type. Please refresh your session.' });
    }

    const row = await userModel.findById(decodedToken.id);
    if (!row) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    req.user = userModel.rowToUser(row);
    next();
  } catch (error) {
    console.error('Error in pg isAuthorized middleware:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    if (user.role !== 1) {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }

    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// Middleware to check if user is super admin
const isSuperAdmin = (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    if (user.role !== 2) {
      return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
    }

    next();
  } catch (error) {
    console.error('Error in isSuperAdmin middleware:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// Middleware to check if user is admin or super admin
const isAdminOrSuperAdmin = (req, res, next) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    if (user.role !== 1 && user.role !== 2) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin or Super Admin only.' });
    }

    next();
  } catch (error) {
    console.error('Error in isAdminOrSuperAdmin middleware:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  isAuthorized,
  isAdmin,
  isSuperAdmin,
  isAdminOrSuperAdmin,
};
