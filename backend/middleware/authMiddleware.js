const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Enhanced middleware to check if user is authorized with access token
const isAuthorized = async (req, res, next) => {
    try {
        const { accessToken } = req.cookies;

        if (!accessToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token not provided. Please log in first.' 
            });
        }

        // Verify access token
        const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);

        // Check if token is not a refresh token
        if (decodedToken.type === 'refresh') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token type. Please refresh your session.' 
            });
        }

        const user = await User.findById(decodedToken.id);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error in isAuthorized middleware:', error.message);
        
        // Check if it's a token expiration error
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token expired. Please refresh your session.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token.' 
        });
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
