const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgProductController = require('../controllers/pgProductController');
const pgReviewController = require('../controllers/pgReviewController');

// Parallel Postgres/Supabase product endpoints — for migration testing only.
// Mirrors /api/* product endpoints exactly (same request/response shape).
router.post(
  '/pg/create-product',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.fields([{ name: 'picture', maxCount: 1 }, { name: 'images', maxCount: 10 }]),
  pgProductController.createProduct
);

router.put(
  '/pg/update-product/:id',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.fields([{ name: 'picture', maxCount: 1 }, { name: 'images', maxCount: 10 }]),
  pgProductController.updateProduct
);

router.put('/pg/update-product-stock/:id', isAuthorized, isAdminOrSuperAdmin, pgProductController.updateProductStock);
router.delete('/pg/delete-product/:id', isAuthorized, isAdminOrSuperAdmin, pgProductController.deleteProduct);
router.patch('/pg/restore-product/:id', isAuthorized, isAdminOrSuperAdmin, pgProductController.restoreProduct);

router.get('/pg/new-arrivals', pgProductController.getNewArrivals);
router.get('/pg/get-products', pgProductController.getProducts);
router.get('/pg/single-product/slug/:slug', pgProductController.getProductBySlug);
router.get('/pg/single-product/:id', pgProductController.getProductById);
router.get('/pg/search-suggestions', pgProductController.getSearchSuggestions);

router.get('/pg/reviews', isAuthorized, isAdminOrSuperAdmin, pgReviewController.getAllReviews);
router.get('/pg/products/:identifier/reviews', pgReviewController.getProductReviews);
router.post('/pg/products/:identifier/reviews', isAuthorized, pgReviewController.createReview);
router.put('/pg/products/:identifier/reviews/:reviewId', isAuthorized, pgReviewController.updateReview);
router.delete('/pg/products/:identifier/reviews/:reviewId', isAuthorized, pgReviewController.deleteReview);
router.put('/pg/products/:identifier/reviews/:reviewId/reply', isAuthorized, isAdminOrSuperAdmin, pgReviewController.replyToReview);

module.exports = router;
