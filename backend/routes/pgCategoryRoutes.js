const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const upload = require('../middleware/multer');
const pgCategoryController = require('../controllers/pgCategoryController');

const router = express.Router();

// Parallel Postgres/Supabase category endpoints — for migration testing only.
// Mirrors /api/category/* exactly (same request/response shape).
router.post('/pg/category/create', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), pgCategoryController.createCategory);
router.get('/pg/category/list', pgCategoryController.listCategories);
router.put('/pg/category/:id', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), pgCategoryController.updateCategory);
router.delete('/pg/category/:id', isAuthorized, isAdminOrSuperAdmin, pgCategoryController.deleteCategory);

module.exports = router;
