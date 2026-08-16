const express = require('express');
const { isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgAdminCustomerController = require('../controllers/pgAdminCustomerController');

const router = express.Router();

router.get('/pg/admin/customers', isAdminOrSuperAdmin, pgAdminCustomerController.getCustomers);
// Must come before '/:id' — otherwise Express would match "stats" as an :id param.
router.get('/pg/admin/customers/stats', isAdminOrSuperAdmin, pgAdminCustomerController.getCustomerStats);
router.get('/pg/admin/customers/:id', isAdminOrSuperAdmin, pgAdminCustomerController.getCustomer);
router.get('/pg/admin/customers/:id/orders', isAdminOrSuperAdmin, pgAdminCustomerController.getCustomerOrders);
router.patch('/pg/admin/customers/:id/status', isAdminOrSuperAdmin, pgAdminCustomerController.updateCustomerStatus);
router.post('/pg/admin/customers/:id/blacklist', isAdminOrSuperAdmin, pgAdminCustomerController.blacklistCustomer);
router.post('/pg/admin/customers/:id/unblacklist', isAdminOrSuperAdmin, pgAdminCustomerController.unblacklistCustomer);

module.exports = router;
