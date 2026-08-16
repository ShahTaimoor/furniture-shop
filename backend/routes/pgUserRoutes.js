const express = require('express');
const { isAuthorized, isSuperAdmin, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgAuthController = require('../controllers/pgAuthController');
const pgUserController = require('../controllers/pgUserController');

const router = express.Router();

// Auth
router.post('/pg/signup', pgAuthController.signup);
router.post('/pg/login', pgAuthController.login);
router.post('/pg/refresh-token', pgAuthController.refreshToken);
router.get('/pg/logout', pgAuthController.logout);
router.post('/pg/logout', pgAuthController.logoutPost);
router.get('/pg/verify-token', pgAuthController.verifyToken);

// Users
router.get('/pg/all-users', isAuthorized, isAdminOrSuperAdmin, pgUserController.getAllUsers);
router.put('/pg/update-profile', isAuthorized, pgUserController.updateProfile);
router.post('/pg/kill-all-sessions/:userId', isAuthorized, isAdminOrSuperAdmin, pgUserController.killAllSessions);
router.put('/pg/update-user-role/:userId', isAuthorized, isSuperAdmin, pgUserController.updateUserRole);
router.put('/pg/change-password', isAuthorized, pgUserController.changePassword);
router.put('/pg/update-username', isAuthorized, pgUserController.updateUsername);

module.exports = router;
