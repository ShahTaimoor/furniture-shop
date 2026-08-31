const express = require('express');
const upload = require('../middleware/multer');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgSettingsController = require('../controllers/pgSettingsController');

const router = express.Router();

router.get('/pg/settings', pgSettingsController.getSettings);
router.put('/pg/settings', isAuthorized, isAdminOrSuperAdmin, pgSettingsController.updateSettings);
router.post('/pg/settings/logo', isAuthorized, isAdminOrSuperAdmin, upload.single('logo'), pgSettingsController.uploadLogo);
router.delete('/pg/settings/logo', isAuthorized, isAdminOrSuperAdmin, pgSettingsController.deleteLogo);

module.exports = router;
