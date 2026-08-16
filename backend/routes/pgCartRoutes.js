const express = require('express');
const { isAuthorized } = require('../middleware/pgAuthMiddleware');
const pgCartController = require('../controllers/pgCartController');

const router = express.Router();

router.get('/pg/cart', isAuthorized, pgCartController.getCart);
router.post('/pg/cart/add', isAuthorized, pgCartController.addToCart);
router.post('/pg/cart/remove', isAuthorized, pgCartController.removeFromCart);
router.post('/pg/cart/empty', isAuthorized, pgCartController.emptyCart);
router.post('/pg/cart/update', isAuthorized, pgCartController.updateCartItem);

module.exports = router;
