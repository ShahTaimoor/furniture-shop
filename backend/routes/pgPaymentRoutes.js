const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgPaymentController = require('../controllers/pgPaymentController');

const router = express.Router();

router.post('/pg/payments/create-checkout-session', isAuthorized, pgPaymentController.createCheckoutSession);
router.post('/pg/payments/confirm', isAuthorized, pgPaymentController.confirmPayment);
router.post('/pg/payments/mark-complete', isAuthorized, pgPaymentController.markComplete);
router.post('/pg/payments/create', isAuthorized, pgPaymentController.createPayment);
router.get('/pg/payments/:id', isAuthorized, pgPaymentController.getPayment);
router.get('/pg/payments', isAuthorized, pgPaymentController.getMyPayments);

router.get('/pg/admin/payments', isAdminOrSuperAdmin, pgPaymentController.getAllPayments);
router.post('/pg/admin/payments/:id/refund', isAdminOrSuperAdmin, pgPaymentController.refundPayment);

module.exports = router;
