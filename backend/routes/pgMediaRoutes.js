const express = require('express');
const multer = require('multer');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgMediaController = require('../controllers/pgMediaController');

const router = express.Router();

// Test route to verify pgMediaRoutes is working
router.get('/pg/media/test', (req, res) => {
  res.json({ success: true, message: 'PG media routes are working' });
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  try {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }

    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!supportedTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported image format. Please use JPEG, PNG, WebP, or AVIF'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  }
});

// Parallel Postgres/Supabase media endpoints — for migration testing only.
// Mirrors /api/media exactly (same request/response shape).
router.post('/pg/media/upload', isAuthorized, isAdminOrSuperAdmin, upload.array('images', 10), pgMediaController.uploadMedia);
router.get('/pg/media', isAuthorized, isAdminOrSuperAdmin, pgMediaController.listMedia);
router.get('/pg/media/search', isAuthorized, isAdminOrSuperAdmin, pgMediaController.searchMedia);
router.delete('/pg/media/bulk', isAuthorized, isAdminOrSuperAdmin, pgMediaController.bulkDeleteMedia);
router.delete('/pg/media/:id', isAuthorized, isAdminOrSuperAdmin, pgMediaController.deleteMedia);

module.exports = router;
