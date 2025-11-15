const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// REST endpoints
router.post('/category/create', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), categoryController.createCategory);
router.get('/category/list', categoryController.listCategories);
router.put('/category/:id', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), categoryController.updateCategory);
router.delete('/category/:id', isAuthorized, isAdminOrSuperAdmin, categoryController.deleteCategory);

// Backwards-compatible aliases (optional)
router.post('/create-category', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), categoryController.createCategory);
router.get('/all-category', categoryController.listCategories);
router.put('/update-category/:id', isAuthorized, isAdminOrSuperAdmin, upload.single('image'), categoryController.updateCategory);
router.delete('/delete-category/:id', isAuthorized, isAdminOrSuperAdmin, categoryController.deleteCategory);

module.exports = router;
