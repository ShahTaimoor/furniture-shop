const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        // User who will receive the notification
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Notification type
        type: {
            type: String,
            enum: [
                'order_confirmation',
                'order_shipped',
                'order_delivered',
                'order_cancelled',
                'payment_success',
                'payment_failed',
                'promotional',
                'system',
                'review_approved',
                'review_rejected',
                'stock_alert',
                'price_drop',
                'new_product'
            ],
            required: true,
            index: true
        },
        // Notification title
        title: {
            type: String,
            required: true,
            trim: true
        },
        // Notification message/body
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },
        // Related entity (order, product, etc.)
        relatedEntity: {
            type: {
                type: String,
                enum: ['order', 'product', 'payment', 'review', null],
                default: null
            },
            id: {
                type: mongoose.Schema.Types.ObjectId
            }
        },
        // Notification priority
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        },
        // Read status
        isRead: {
            type: Boolean,
            default: false,
            index: true
        },
        // Read at timestamp
        readAt: {
            type: Date
        },
        // Notification channels sent
        channels: {
            email: {
                sent: { type: Boolean, default: false },
                sentAt: { type: Date },
                error: { type: String }
            },
            sms: {
                sent: { type: Boolean, default: false },
                sentAt: { type: Date },
                error: { type: String }
            },
            push: {
                sent: { type: Boolean, default: false },
                sentAt: { type: Date },
                error: { type: String }
            },
            inApp: {
                sent: { type: Boolean, default: true },
                sentAt: { type: Date }
            }
        },
        // Action button (optional)
        action: {
            label: { type: String },
            url: { type: String }
        },
        // Additional data
        data: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // Expiry date (for time-sensitive notifications)
        expiresAt: {
            type: Date
        }
    },
    { timestamps: true }
);

// Indexes
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
    return this;
};

// Static method to mark multiple as read
notificationSchema.statics.markMultipleAsRead = async function(userId, notificationIds) {
    return this.updateMany(
        {
            _id: { $in: notificationIds },
            user: userId
        },
        {
            $set: {
                isRead: true,
                readAt: new Date()
            }
        }
    );
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
    return this.updateMany(
        {
            user: userId,
            isRead: false
        },
        {
            $set: {
                isRead: true,
                readAt: new Date()
            }
        }
    );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({
        user: userId,
        isRead: false
    });
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
    const notification = new this(notificationData);
    await notification.save();
    
    // Here you can add logic to send email/SMS/push notifications
    // based on user preferences and notification channels
    
    return notification;
};

// Static method to clean expired notifications (optional)
notificationSchema.statics.cleanExpired = async function() {
    return this.deleteMany({
        expiresAt: { $exists: true, $lt: new Date() }
    });
};

module.exports = mongoose.model('Notification', notificationSchema);

