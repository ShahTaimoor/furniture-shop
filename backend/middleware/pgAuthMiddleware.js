const jwt = require('jsonwebtoken');
const userModel = require('../models/postgres/userModel');
const { isAdmin, isSuperAdmin, isAdminOrSuperAdmin } = require('./authMiddleware');

// Same contract as the Mongo isAuthorized — req.user ends up with the same shape
// (_id, id, role, email, name, ...) so every existing bridge controller that reads
// req.user._id / req.user.id / req.user.role keeps working unchanged.
const isAuthorized = async (req, res, next) => {
  try {
    const { accessToken } = req.cookies;

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

module.exports = {
  isAuthorized,
  isAdmin,
  isSuperAdmin,
  isAdminOrSuperAdmin,
};
