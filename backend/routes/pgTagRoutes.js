const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgTagController = require('../controllers/pgTagController');

const router = express.Router();

// Parallel Postgres/Supabase tag endpoints — for migration testing only.
// Mirrors /api/tags exactly (same request/response shape).
router.get('/pg/tags', pgTagController.getTags);
router.post('/pg/tags', isAuthorized, isAdminOrSuperAdmin, pgTagController.createTag);
router.put('/pg/tags/:id', isAuthorized, isAdminOrSuperAdmin, pgTagController.updateTag);
router.patch('/pg/tags/:id/toggle', isAuthorized, isAdminOrSuperAdmin, pgTagController.toggleTag);
router.delete('/pg/tags/:id', isAuthorized, isAdminOrSuperAdmin, pgTagController.deleteTag);

module.exports = router;
