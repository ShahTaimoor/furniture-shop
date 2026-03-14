const { SessionService } = require('../services/redisService');
const jwt = require('jsonwebtoken');

/**
 * Middleware to validate session fingerprint
 * This middleware checks if the session fingerprint matches the stored one
 * Use this for sensitive endpoints that require additional session validation
 */
const validateSessionFingerprint = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      // If no refresh token, skip fingerprint validation
      // This allows access token-only endpoints to work
      return next();
    }

    try {
      const decoded = jwt.decode(refreshToken);
      if (!decoded || !decoded.id) {
        return next();
      }

      const userId = decoded.id.toString();
      const fingerprint = SessionService.generateFingerprint(req);
      
      const validation = await SessionService.validateSession(userId, refreshToken, fingerprint);
      
      if (!validation.valid) {
        return res.status(401).json({
          success: false,
          message: validation.reason || 'Session validation failed',
          code: 'SESSION_INVALID'
        });
      }

      // Attach fingerprint to request for use in route handlers
      req.sessionFingerprint = fingerprint;
      req.sessionValid = true;
      
      next();
    } catch (error) {
      // If token decode fails, skip fingerprint validation
      // Let other middleware handle authentication
      return next();
    }
  } catch (error) {
    console.error('Session fingerprint validation error:', error);
    // Don't block request on middleware error, let it proceed
    next();
  }
};

/**
 * Middleware to require session validation
 * Use this for endpoints that MUST have valid session fingerprint
 */
const requireSessionValidation = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required for session validation',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const decoded = jwt.decode(refreshToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_TOKEN'
      });
    }

    const userId = decoded.id.toString();
    const fingerprint = SessionService.generateFingerprint(req);
    
    const validation = await SessionService.validateSession(userId, refreshToken, fingerprint);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: validation.reason || 'Session validation failed',
        code: 'SESSION_INVALID'
      });
    }

    req.sessionFingerprint = fingerprint;
    req.sessionValid = true;
    req.sessionData = validation.session;
    
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Session validation error',
      code: 'SESSION_ERROR'
    });
  }
};

module.exports = {
  validateSessionFingerprint,
  requireSessionValidation
};

