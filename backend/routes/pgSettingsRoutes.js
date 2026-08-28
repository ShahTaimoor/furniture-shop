const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgSettingsController = require('../controllers/pgSettingsController');

const router = express.Router();

router.get('/pg/settings', pgSettingsController.getSettings);
router.put('/pg/settings', isAuthorized, isAdminOrSuperAdmin, pgSettingsController.updateSettings);

module.exports = router;
