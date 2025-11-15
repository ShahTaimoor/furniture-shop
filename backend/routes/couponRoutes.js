const express = require('express');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const User = require('../models/User');
const { isAuthorized, isAdmin, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// User routes - Validate coupon
router.post('/coupons/validate', isAuthorized, async (req, res) => {
    try {
        const { code, orderAmount, productIds = [] } = req.body;

        if (!code || !orderAmount) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and order amount are required'
            });
        }

        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase().trim(),
            status: 'active'
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Check if coupon is valid
        if (!coupon.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Coupon has expired or reached usage limit'
            });
        }

        // Check if user can use this coupon
        const user = await User.findById(req.user.userId || req.user.id);
        const isFirstTimeUser = !(await Order.findOne({ userId: user._id }));
        
        const canUse = coupon.canBeUsedBy(user._id, isFirstTimeUser);
        if (!canUse.valid) {
            return res.status(400).json({
                success: false,
                message: canUse.reason
            });
        }

        // Calculate discount
        const discountResult = coupon.calculateDiscount(Number(orderAmount));
        if (!discountResult.valid) {
            return res.status(400).json({
                success: false,
                message: discountResult.reason
            });
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
                finalAmount: discountResult.finalAmount
            }
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon'
        });
    }
});

// Admin routes - Get all coupons
router.get('/admin/coupons', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const query = {};
        if (status) {
            query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const coupons = await Coupon.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Coupon.countDocuments(query);

        res.json({
            success: true,
            coupons,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons'
        });
    }
});

// Admin routes - Get single coupon
router.get('/admin/coupons/:id', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('applicableCategories', 'name')
            .populate('applicableProducts', 'title')
            .populate('usedBy.user', 'name email');

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            coupon
        });
    } catch (error) {
        console.error('Get coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon'
        });
    }
});

// Admin routes - Create coupon
router.post('/admin/coupons', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const couponData = {
            ...req.body,
            code: req.body.code?.toUpperCase().trim(),
            createdBy: req.user.userId || req.user.id
        };

        // Validate dates
        if (couponData.validFrom && couponData.validUntil) {
            if (new Date(couponData.validUntil) < new Date(couponData.validFrom)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid until date must be after valid from date'
                });
            }
        }

        const coupon = await Coupon.create(couponData);

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            coupon
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create coupon'
        });
    }
});

// Admin routes - Update coupon
router.put('/admin/coupons/:id', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        const updateData = { ...req.body };
        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase().trim();
        }

        // Validate dates
        const validFrom = updateData.validFrom ? new Date(updateData.validFrom) : coupon.validFrom;
        const validUntil = updateData.validUntil ? new Date(updateData.validUntil) : coupon.validUntil;
        
        if (validUntil < validFrom) {
            return res.status(400).json({
                success: false,
                message: 'Valid until date must be after valid from date'
            });
        }

        Object.assign(coupon, updateData);
        await coupon.save();

        res.json({
            success: true,
            message: 'Coupon updated successfully',
            coupon
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update coupon'
        });
    }
});

// Admin routes - Delete coupon
router.delete('/admin/coupons/:id', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Soft delete by setting status to inactive
        coupon.status = 'inactive';
        await coupon.save();

        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete coupon'
        });
    }
});

// Admin routes - Get coupon usage statistics
router.get('/admin/coupons/:id/stats', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        const stats = {
            totalUsage: coupon.usageCount,
            remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : null,
            uniqueUsers: new Set(coupon.usedBy.map(u => String(u.user))).size,
            isValid: coupon.isValid,
            expiresAt: coupon.validUntil
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get coupon stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon statistics'
        });
    }
});

// Auto-expire coupons (can be called via cron job)
router.post('/admin/coupons/expire', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const result = await Coupon.expireCoupons();
        res.json({
            success: true,
            message: 'Expired coupons updated',
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('Expire coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to expire coupons'
        });
    }
});

module.exports = router;

