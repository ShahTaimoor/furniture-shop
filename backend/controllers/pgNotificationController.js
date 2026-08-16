const notificationModel = require('../models/postgres/notificationModel');

const getNotifications = async (req, res) => {
  try {
    const { type, isRead, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId || req.user.id;

    const { notifications, total } = await notificationModel.findForUser(userId, {
      type,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    });

    const unreadCount = await notificationModel.getUnreadCount(userId);

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
    console.error('pg getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const count = await notificationModel.getUnreadCount(userId);

    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('pg getUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const notification = await notificationModel.findByIdForUser(req.params.id, userId);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notificationModel.markAsRead(req.params.id, userId);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('pg markAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

const markMultipleAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide notification IDs' });
    }

    await notificationModel.markMultipleAsRead(userId, notificationIds);

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('pg markMultipleAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    await notificationModel.markAllAsRead(userId);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('pg markAllAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const notification = await notificationModel.deleteByIdForUser(req.params.id, userId);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('pg deleteNotification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { userIds, type, title, message, priority, action, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide user IDs' });
    }

    if (!type || !title || !message) {
      return res.status(400).json({ success: false, message: 'Type, title, and message are required' });
    }

    const notifications = [];
    for (const userId of userIds) {
      // eslint-disable-next-line no-await-in-loop
      const notification = await notificationModel.create({
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
    console.error('pg sendNotification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notifications' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
};
