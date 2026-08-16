const express = require('express');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/pgAuthMiddleware');
const pgNotificationController = require('../controllers/pgNotificationController');

const router = express.Router();

// Parallel Postgres/Supabase notification endpoints — for migration testing only.
// Mirrors /api/notifications exactly (same request/response shape).
router.get('/pg/notifications', isAuthorized, pgNotificationController.getNotifications);
router.get('/pg/notifications/unread-count', isAuthorized, pgNotificationController.getUnreadCount);
router.patch('/pg/notifications/:id/read', isAuthorized, pgNotificationController.markAsRead);
router.patch('/pg/notifications/mark-read', isAuthorized, pgNotificationController.markMultipleAsRead);
router.patch('/pg/notifications/mark-all-read', isAuthorized, pgNotificationController.markAllAsRead);
router.delete('/pg/notifications/:id', isAuthorized, pgNotificationController.deleteNotification);
router.post('/pg/admin/notifications', isAdminOrSuperAdmin, pgNotificationController.sendNotification);

module.exports = router;
