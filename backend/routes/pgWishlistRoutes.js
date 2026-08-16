const express = require('express');
const { isAuthorized } = require('../middleware/pgAuthMiddleware');
const pgWishlistController = require('../controllers/pgWishlistController');

const router = express.Router();

router.get('/pg/wishlist', isAuthorized, pgWishlistController.getWishlist);
router.post('/pg/wishlist/add', isAuthorized, pgWishlistController.addToWishlist);
router.post('/pg/wishlist/remove', isAuthorized, pgWishlistController.removeFromWishlist);
router.post('/pg/wishlist/clear', isAuthorized, pgWishlistController.clearWishlist);

module.exports = router;
