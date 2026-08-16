const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgCouponController = require('../controllers/pgCouponController');

const router = express.Router();

router.post('/pg/coupons/validate', isAuthorized, pgCouponController.validateCoupon);

router.get('/pg/admin/coupons', isAdminOrSuperAdmin, pgCouponController.listCoupons);
router.get('/pg/admin/coupons/:id', isAdminOrSuperAdmin, pgCouponController.getCoupon);
router.post('/pg/admin/coupons', isAdminOrSuperAdmin, pgCouponController.createCoupon);
router.put('/pg/admin/coupons/:id', isAdminOrSuperAdmin, pgCouponController.updateCoupon);
router.delete('/pg/admin/coupons/:id', isAdminOrSuperAdmin, pgCouponController.deleteCoupon);
router.get('/pg/admin/coupons/:id/stats', isAdminOrSuperAdmin, pgCouponController.getCouponStats);
router.post('/pg/admin/coupons/expire', isAdminOrSuperAdmin, pgCouponController.expireCoupons);

module.exports = router;
