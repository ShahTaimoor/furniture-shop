const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');

// @route POST /api/create-product
router.post(
  '/create-product',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  productController.createProduct
);

// @route POST /api/import-excel
router.post(
  '/import-excel',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.single('excelFile'),
  productController.importExcel
);

// @route PUT /api/update-product/:id
router.put(
  '/update-product/:id',
  isAuthorized,
  isAdminOrSuperAdmin,
  upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  productController.updateProduct
);

// @route PUT /api/update-product-stock/:id
router.put('/update-product-stock/:id', isAuthorized, isAdminOrSuperAdmin, productController.updateProductStock);

// @route DELETE /api/delete-product/:id
router.delete('/delete-product/:id', isAuthorized, isAdminOrSuperAdmin, productController.deleteProduct);

// @route PATCH /api/restore-product/:id
router.patch('/restore-product/:id', isAuthorized, isAdminOrSuperAdmin, productController.restoreProduct);

// @route GET /api/new-arrivals
router.get('/new-arrivals', productController.getNewArrivals);

// @route GET /api/get-products
router.get('/get-products', productController.getProducts);

// @route GET /api/single-product/slug/:slug
router.get('/single-product/slug/:slug', productController.getProductBySlug);

// @route GET /api/single-product/:id
router.get('/single-product/:id', productController.getProductById);

// @route GET /api/search-suggestions
router.get('/search-suggestions', productController.getSearchSuggestions);

// @route GET /api/reviews (admin: all reviews across products)
router.get('/reviews', isAuthorized, isAdminOrSuperAdmin, reviewController.getAllReviews);

// @route GET /api/products/:identifier/reviews
router.get('/products/:identifier/reviews', reviewController.getProductReviews);

// @route POST /api/products/:identifier/reviews
router.post('/products/:identifier/reviews', isAuthorized, reviewController.createReview);

// @route PUT /api/products/:identifier/reviews/:reviewId
router.put('/products/:identifier/reviews/:reviewId', isAuthorized, reviewController.updateReview);

// @route DELETE /api/products/:identifier/reviews/:reviewId
router.delete('/products/:identifier/reviews/:reviewId', isAuthorized, reviewController.deleteReview);

// @route PUT /api/products/:identifier/reviews/:reviewId/reply
router.put('/products/:identifier/reviews/:reviewId/reply', isAuthorized, isAdminOrSuperAdmin, reviewController.replyToReview);

module.exports = router;
