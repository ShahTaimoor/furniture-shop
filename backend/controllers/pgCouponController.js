const couponModel = require('../models/postgres/couponModel');
const orderModel = require('../models/postgres/orderModel');

// @route POST /api/pg/coupons/validate
const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || !orderAmount) {
      return res.status(400).json({ success: false, message: 'Coupon code and order amount are required' });
    }

    const coupon = await couponModel.findByCode(code);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }
    if (!coupon.isValid) {
      return res.status(400).json({ success: false, message: 'Coupon has expired or reached usage limit' });
    }

    const userId = req.user._id.toString();
    const isFirstTimeUser = !(await orderModel.findByUserId(userId));
    const canUse = coupon.canBeUsedBy(userId, isFirstTimeUser);
    if (!canUse.valid) {
      return res.status(400).json({ success: false, message: canUse.reason });
    }

    const discountResult = coupon.calculateDiscount(Number(orderAmount));
    if (!discountResult.valid) {
      return res.status(400).json({ success: false, message: discountResult.reason });
    }

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountResult.discountAmount,
        finalAmount: discountResult.finalAmount,
      },
    });
  } catch (error) {
    console.error('pg validateCoupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
};

// @route GET /api/pg/admin/coupons
const listCoupons = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { coupons, total } = await couponModel.list({ status, page: Number(page), limit: Number(limit) });

    res.json({
      success: true,
      coupons,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('pg listCoupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

// @route GET /api/pg/admin/coupons/:id
const getCoupon = async (req, res) => {
  try {
    const coupon = await couponModel.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, coupon });
  } catch (error) {
    console.error('pg getCoupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
  }
};

// @route POST /api/pg/admin/coupons
const createCoupon = async (req, res) => {
  try {
    const { validFrom, validUntil } = req.body;
    if (validFrom && validUntil && new Date(validUntil) < new Date(validFrom)) {
      return res.status(400).json({ success: false, message: 'Valid until date must be after valid from date' });
    }

    const existing = req.body.code ? await couponModel.findByCode(req.body.code) : null;
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = await couponModel.create({ ...req.body, createdBy: req.user._id.toString() });
    res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error('pg createCoupon error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
};

// @route PUT /api/pg/admin/coupons/:id
const updateCoupon = async (req, res) => {
  try {
    const existing = await couponModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Coupon not found' });

    const validFrom = req.body.validFrom ? new Date(req.body.validFrom) : new Date(existing.validFrom);
    const validUntil = req.body.validUntil ? new Date(req.body.validUntil) : new Date(existing.validUntil);
    if (validUntil < validFrom) {
      return res.status(400).json({ success: false, message: 'Valid until date must be after valid from date' });
    }

    const coupon = await couponModel.update(req.params.id, req.body);
    res.json({ success: true, message: 'Coupon updated successfully', coupon });
  } catch (error) {
    console.error('pg updateCoupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
};

// @route DELETE /api/pg/admin/coupons/:id (soft delete)
const deleteCoupon = async (req, res) => {
  try {
    const existing = await couponModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Coupon not found' });

    await couponModel.setStatus(req.params.id, 'inactive');
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('pg deleteCoupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};

// @route GET /api/pg/admin/coupons/:id/stats
const getCouponStats = async (req, res) => {
  try {
    const coupon = await couponModel.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    const stats = {
      totalUsage: coupon.usageCount,
      remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : null,
      uniqueUsers: new Set(coupon.usedBy.map((u) => u.user)).size,
      isValid: coupon.isValid,
      expiresAt: coupon.validUntil,
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('pg getCouponStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupon statistics' });
  }
};

// @route POST /api/pg/admin/coupons/expire
const expireCoupons = async (req, res) => {
  try {
    const count = await couponModel.expireCoupons();
    res.json({ success: true, message: 'Expired coupons updated', count });
  } catch (error) {
    console.error('pg expireCoupons error:', error);
    res.status(500).json({ success: false, message: 'Failed to expire coupons' });
  }
};

module.exports = {
  validateCoupon,
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats,
  expireCoupons,
};
