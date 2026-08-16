const express = require('express');
const upload = require('../middleware/multer');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgBannerController = require('../controllers/pgBannerController');

const router = express.Router();

// Parallel Postgres/Supabase banner endpoints — for migration testing only.
// Mirrors /api/banners exactly (same request/response shape).
router.post('/pg/banners', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), pgBannerController.createBanner);
router.get('/pg/banners', pgBannerController.listBanners);
router.get('/pg/banners/:placement', pgBannerController.listBannersByPlacement);
router.put('/pg/banners/:id', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), pgBannerController.updateBanner);
router.delete('/pg/banners/:id', isAuthorized, isAdminOrSuperAdmin, pgBannerController.deleteBanner);

module.exports = router;
