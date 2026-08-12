const express = require('express');
const { isAuthorized, isSuperAdmin, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// Auth
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/logout', authController.logout);
router.post('/logout', authController.logoutPost);
router.get('/verify-token', authController.verifyToken);

// Users
router.get('/all-users', isAuthorized, isAdminOrSuperAdmin, userController.getAllUsers);
router.put('/update-profile', isAuthorized, userController.updateProfile);
router.post('/kill-all-sessions/:userId', isAuthorized, isAdminOrSuperAdmin, userController.killAllSessions);
router.put('/update-user-role/:userId', isAuthorized, isSuperAdmin, userController.updateUserRole);
router.put('/change-password', isAuthorized, userController.changePassword);
router.put('/update-username', isAuthorized, userController.updateUsername);

module.exports = router;
