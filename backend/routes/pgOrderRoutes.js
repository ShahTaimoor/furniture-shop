const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgOrderController = require('../controllers/pgOrderController');

const router = express.Router();

// Checkout
router.post('/pg/order/guest', pgOrderController.createGuestOrder);
router.post('/pg/order', isAuthorized, pgOrderController.createOrder);

// Status / tracking
router.patch('/pg/orders/:id/status', isAuthorized, isAdminOrSuperAdmin, pgOrderController.updateOrderStatusHandler);
router.put('/pg/update-order-status/:id', isAuthorized, isAdminOrSuperAdmin, pgOrderController.updateOrderStatusHandler);
router.patch('/pg/orders/:id/location', isAuthorized, isAdminOrSuperAdmin, pgOrderController.updateLocation);
router.get('/pg/orders/:id/track', isAuthorized, pgOrderController.trackOrder);

// Listing / admin
router.get('/pg/get-orders-by-user-id', isAuthorized, pgOrderController.getOrdersByUserId);
router.get('/pg/get-all-orders', isAuthorized, isAdminOrSuperAdmin, pgOrderController.getAllOrders);
router.get('/pg/get-metrics', isAuthorized, isAdminOrSuperAdmin, pgOrderController.getMetrics);
router.get('/pg/pending-orders-count', isAuthorized, isAdminOrSuperAdmin, pgOrderController.getPendingOrdersCount);
router.delete('/pg/delete-order/:id', isAuthorized, isAdminOrSuperAdmin, pgOrderController.deleteOrder);
router.delete('/pg/bulk-delete-orders', isAuthorized, isAdminOrSuperAdmin, pgOrderController.bulkDeleteOrders);

module.exports = router;
