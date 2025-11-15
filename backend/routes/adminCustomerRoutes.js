const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Address = require('../models/Address');
const { isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// All admin routes require elevated access
router.use('/admin', isAdminOrSuperAdmin);

// Get all customers with pagination and filters
router.get('/admin/customers', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search, 
            role, 
            isActive, 
            isBlacklisted,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { role: 0 }; // Only regular users/customers

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Role filter (should be 0 for customers, but keeping for flexibility)
        if (role !== undefined) {
            query.role = Number(role);
        }

        // Active status filter
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Blacklist filter
        if (isBlacklisted !== undefined) {
            query.isBlacklisted = isBlacklisted === 'true';
        }

        const skip = (Number(page) - 1) * Number(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const customers = await User.find(query)
            .select('-password -emailVerificationToken -passwordResetToken')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        const total = await User.countDocuments(query);

        // Get additional stats
        const stats = {
            total: await User.countDocuments({ role: 0 }),
            active: await User.countDocuments({ role: 0, isActive: true }),
            blacklisted: await User.countDocuments({ role: 0, isBlacklisted: true }),
            inactive: await User.countDocuments({ role: 0, isActive: false })
        };

        res.json({
            success: true,
            customers,
            stats,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customers'
        });
    }
});

// Get single customer by ID
router.get('/admin/customers/:id', async (req, res) => {
    try {
        const customer = await User.findById(req.params.id)
            .select('-password -emailVerificationToken -passwordResetToken');

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Get customer order count and total spent
        const orders = await Order.find({ userId: customer._id });
        const orderStats = {
            totalOrders: orders.length,
            totalSpent: orders.reduce((sum, order) => sum + (order.amount || 0), 0),
            completedOrders: orders.filter(o => o.status === 'delivered').length,
            pendingOrders: orders.filter(o => o.status === 'pending').length
        };

        // Get customer addresses
        const addresses = await Address.find({ user: customer._id, isActive: true });

        res.json({
            success: true,
            customer: {
                ...customer.toObject(),
                orderStats,
                addresses
            }
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer'
        });
    }
});

// Get customer order history
router.get('/admin/customers/:id/orders', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const query = { userId: req.params.id };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const orders = await Order.find(query)
            .populate('products.id', 'title slug picture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer orders'
        });
    }
});

// Update customer status (blacklist/activate)
router.patch('/admin/customers/:id/status', async (req, res) => {
    try {
        const { isActive, isBlacklisted } = req.body;

        const customer = await User.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        if (isActive !== undefined) {
            customer.isActive = isActive;
        }

        if (isBlacklisted !== undefined) {
            customer.isBlacklisted = isBlacklisted;
        }

        await customer.save();

        res.json({
            success: true,
            message: 'Customer status updated successfully',
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                isActive: customer.isActive,
                isBlacklisted: customer.isBlacklisted
            }
        });
    } catch (error) {
        console.error('Update customer status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update customer status'
        });
    }
});

// Blacklist customer
router.post('/admin/customers/:id/blacklist', async (req, res) => {
    try {
        const customer = await User.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        customer.isBlacklisted = true;
        customer.isActive = false;
        await customer.save();

        res.json({
            success: true,
            message: 'Customer blacklisted successfully',
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                isBlacklisted: customer.isBlacklisted
            }
        });
    } catch (error) {
        console.error('Blacklist customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to blacklist customer'
        });
    }
});

// Remove from blacklist
router.post('/admin/customers/:id/unblacklist', async (req, res) => {
    try {
        const customer = await User.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        customer.isBlacklisted = false;
        customer.isActive = true;
        await customer.save();

        res.json({
            success: true,
            message: 'Customer removed from blacklist successfully',
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                isBlacklisted: customer.isBlacklisted
            }
        });
    } catch (error) {
        console.error('Unblacklist customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove customer from blacklist'
        });
    }
});

// Get customer statistics
router.get('/admin/customers/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const matchStage = { role: 0 };
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) matchStage.createdAt.$lte = new Date(endDate);
        }

        const stats = await User.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    },
                    blacklisted: {
                        $sum: { $cond: ['$isBlacklisted', 1, 0] }
                    },
                    emailVerified: {
                        $sum: { $cond: ['$emailVerified', 1, 0] }
                    },
                    phoneVerified: {
                        $sum: { $cond: ['$phoneVerified', 1, 0] }
                    }
                }
            }
        ]);

        // Get new customers by date
        const newCustomers = await User.countDocuments({
            role: 0,
            createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        });

        res.json({
            success: true,
            stats: stats[0] || {
                total: 0,
                active: 0,
                blacklisted: 0,
                emailVerified: 0,
                phoneVerified: 0
            },
            newCustomersToday: newCustomers
        });
    } catch (error) {
        console.error('Get customer stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer statistics'
        });
    }
});

module.exports = router;

