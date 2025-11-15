const express = require('express');
const Notification = require('../models/Notification');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// Get all notifications for logged-in user
router.get('/notifications', isAuthorized, async (req, res) => {
    try {
        const { type, isRead, page = 1, limit = 20 } = req.query;
        const userId = req.user.userId || req.user.id;

        const query = { user: userId };
        if (type) query.type = type;
        if (isRead !== undefined) query.isRead = isRead === 'true';

        const skip = (Number(page) - 1) * Number(limit);

        const notifications = await Notification.find(query)
            .populate('relatedEntity.id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.getUnreadCount(userId);

        res.json({
            success: true,
            notifications,
            unreadCount,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// Get unread count
router.get('/notifications/unread-count', isAuthorized, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const count = await Notification.getUnreadCount(userId);

        res.json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count'
        });
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', isAuthorized, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const notification = await Notification.findOne({
            _id: req.params.id,
            user: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await notification.markAsRead();

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark multiple notifications as read
router.patch('/notifications/mark-read', isAuthorized, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { notificationIds } = req.body;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide notification IDs'
            });
        }

        await Notification.markMultipleAsRead(userId, notificationIds);

        res.json({
            success: true,
            message: 'Notifications marked as read'
        });
    } catch (error) {
        console.error('Mark notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notifications as read'
        });
    }
});

// Mark all notifications as read
router.patch('/notifications/mark-all-read', isAuthorized, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        await Notification.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Delete notification
router.delete('/notifications/:id', isAuthorized, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

// Admin route - Send notification
router.post('/admin/notifications', isAdminOrSuperAdmin, async (req, res) => {
    try {
        const { userIds, type, title, message, priority, action, data } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide user IDs'
            });
        }

        if (!type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Type, title, and message are required'
            });
        }

        const notifications = [];

        for (const userId of userIds) {
            const notification = await Notification.createNotification({
                user: userId,
                type,
                title,
                message,
                priority: priority || 'medium',
                action,
                data
            });
            notifications.push(notification);
        }

        res.status(201).json({
            success: true,
            message: 'Notifications sent successfully',
            count: notifications.length
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notifications'
        });
    }
});

module.exports = router;

