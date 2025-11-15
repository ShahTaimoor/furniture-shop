const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        // Coupon code (e.g., "SAVE20", "WELCOME50")
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
            validate: {
                validator: function(v) {
                    return /^[A-Z0-9_-]+$/.test(v);
                },
                message: 'Coupon code can only contain uppercase letters, numbers, hyphens, and underscores'
            }
        },
        // Coupon name/description
        name: {
            type: String,
            required: true,
            trim: true
        },
        // Description
        description: {
            type: String,
            trim: true,
            maxlength: 500
        },
        // Discount type: 'fixed' or 'percentage'
        discountType: {
            type: String,
            enum: ['fixed', 'percentage'],
            required: true
        },
        // Discount value
        discountValue: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: function(v) {
                    if (this.discountType === 'percentage') {
                        return v >= 0 && v <= 100;
                    }
                    return v >= 0;
                },
                message: 'Percentage discount must be between 0 and 100'
            }
        },
        // Minimum order amount to apply coupon
        minimumOrderAmount: {
            type: Number,
            min: 0,
            default: 0
        },
        // Maximum discount amount (for percentage coupons)
        maximumDiscountAmount: {
            type: Number,
            min: 0
        },
        // Validity period
        validFrom: {
            type: Date,
            required: true
        },
        validUntil: {
            type: Date,
            required: true
        },
        // Usage limits
        usageLimit: {
            type: Number,
            min: 0,
            default: null // null means unlimited
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0
        },
        // Per-user usage limit
        perUserLimit: {
            type: Number,
            min: 1,
            default: 1
        },
        // Applicable categories (empty means all categories)
        applicableCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        // Applicable products (empty means all products)
        applicableProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        // Excluded categories
        excludedCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        // Excluded products
        excludedProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        // Applicable for first-time users only
        firstTimeUsersOnly: {
            type: Boolean,
            default: false
        },
        // Status
        status: {
            type: String,
            enum: ['active', 'inactive', 'expired'],
            default: 'active',
            index: true
        },
        // Created by admin
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // Track which users have used this coupon
        usedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            usedAt: {
                type: Date,
                default: Date.now
            },
            orderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Order'
            }
        }]
    },
    { timestamps: true }
);

// Indexes
couponSchema.index({ code: 1, status: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ status: 1, validUntil: 1 });

// Virtual to check if coupon is valid
couponSchema.virtual('isValid').get(function() {
    const now = new Date();
    return (
        this.status === 'active' &&
        this.validFrom <= now &&
        this.validUntil >= now &&
        (this.usageLimit === null || this.usageCount < this.usageLimit)
    );
});

// Method to check if user can use this coupon
couponSchema.methods.canBeUsedBy = function(userId, isFirstTimeUser = false) {
    if (!this.isValid) {
        return { valid: false, reason: 'Coupon is not valid' };
    }

    // Check first-time user requirement
    if (this.firstTimeUsersOnly && !isFirstTimeUser) {
        return { valid: false, reason: 'This coupon is only for first-time users' };
    }

    // Check per-user limit
    const userUsageCount = this.usedBy.filter(
        usage => usage.user?.toString() === userId?.toString()
    ).length;

    if (userUsageCount >= this.perUserLimit) {
        return { valid: false, reason: 'You have reached the maximum usage limit for this coupon' };
    }

    return { valid: true };
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function(orderAmount) {
    // Check minimum order amount
    if (orderAmount < this.minimumOrderAmount) {
        return { 
            valid: false, 
            reason: `Minimum order amount of ${this.minimumOrderAmount} is required` 
        };
    }

    let discountAmount = 0;

    if (this.discountType === 'percentage') {
        discountAmount = (orderAmount * this.discountValue) / 100;
        
        // Apply maximum discount limit if set
        if (this.maximumDiscountAmount && discountAmount > this.maximumDiscountAmount) {
            discountAmount = this.maximumDiscountAmount;
        }
    } else {
        // Fixed discount
        discountAmount = this.discountValue;
        // Don't allow discount more than order amount
        if (discountAmount > orderAmount) {
            discountAmount = orderAmount;
        }
    }

    return {
        valid: true,
        discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
        finalAmount: orderAmount - Math.round(discountAmount * 100) / 100
    };
};

// Method to record coupon usage
couponSchema.methods.recordUsage = async function(userId, orderId) {
    this.usageCount += 1;
    this.usedBy.push({
        user: userId,
        usedAt: new Date(),
        orderId: orderId
    });
    await this.save();
};

// Static method to auto-expire coupons
couponSchema.statics.expireCoupons = async function() {
    const now = new Date();
    return this.updateMany(
        {
            status: 'active',
            validUntil: { $lt: now }
        },
        {
            $set: { status: 'expired' }
        }
    );
};

module.exports = mongoose.model('Coupon', couponSchema);

