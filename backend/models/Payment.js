const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        // Order reference
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true
        },
        // User reference
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Payment method
        paymentMethod: {
            type: String,
            enum: ['COD', 'CARD', 'BANK_TRANSFER', 'MOBILE_WALLET', 'STRIPE', 'PAYPAL', 'EASYPAISA', 'JAZZCASH'],
            required: true,
            index: true
        },
        // Payment status
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
            default: 'pending',
            index: true
        },
        // Amount details
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: 'PKR',
            uppercase: true
        },
        // Transaction ID from payment gateway
        transactionId: {
            type: String,
            sparse: true,
            index: true
        },
        // Payment gateway reference (Stripe payment intent ID, PayPal transaction ID, etc.)
        gatewayReference: {
            type: String,
            sparse: true
        },
        // Payment gateway name
        gatewayName: {
            type: String,
            enum: ['stripe', 'paypal', 'easypaisa', 'jazzcash', 'bank', 'cod', null],
            default: null
        },
        // Payment metadata
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // Payment details from gateway
        gatewayResponse: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // Refund information
        refund: {
            amount: { type: Number, min: 0 },
            reason: { type: String, trim: true },
            refundedAt: { type: Date },
            refundedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            gatewayRefundId: { type: String }
        },
        // Card details (last 4 digits only, for security)
        cardDetails: {
            last4: { type: String },
            brand: { type: String, enum: ['visa', 'mastercard', 'amex', 'discover', 'other'] },
            expiryMonth: { type: Number },
            expiryYear: { type: Number }
        },
        // Mobile wallet details
        walletDetails: {
            provider: { type: String },
            accountNumber: { type: String },
            transactionReference: { type: String }
        },
        // Payment description
        description: {
            type: String,
            trim: true
        },
        // Payment initiated at
        initiatedAt: {
            type: Date,
            default: Date.now
        },
        // Payment completed at
        completedAt: {
            type: Date
        },
        // Failure reason
        failureReason: {
            type: String,
            trim: true
        },
        // Payment attempt number (for retries)
        attemptNumber: {
            type: Number,
            default: 1,
            min: 1
        }
    },
    { timestamps: true }
);

// Indexes
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ gatewayReference: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paymentMethod: 1, status: 1 });

// Virtual to check if payment is successful
paymentSchema.virtual('isSuccessful').get(function() {
    return this.status === 'completed';
});

// Virtual to check if payment is pending
paymentSchema.virtual('isPending').get(function() {
    return this.status === 'pending' || this.status === 'processing';
});

// Virtual to check if payment can be refunded
paymentSchema.virtual('canBeRefunded').get(function() {
    return this.status === 'completed' && !this.refund?.amount;
});

// Method to mark payment as completed
paymentSchema.methods.markCompleted = async function(gatewayData = {}) {
    this.status = 'completed';
    this.completedAt = new Date();
    if (gatewayData.transactionId) {
        this.transactionId = gatewayData.transactionId;
    }
    if (gatewayData.gatewayReference) {
        this.gatewayReference = gatewayData.gatewayReference;
    }
    if (gatewayData.metadata) {
        Object.assign(this.gatewayResponse, gatewayData.metadata);
    }
    await this.save();
    return this;
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = async function(reason = '') {
    this.status = 'failed';
    this.failureReason = reason;
    await this.save();
    return this;
};

// Method to process refund
paymentSchema.methods.processRefund = async function(refundData) {
    if (!this.canBeRefunded) {
        throw new Error('Payment cannot be refunded');
    }

    this.status = 'refunded';
    this.refund = {
        amount: refundData.amount || this.amount,
        reason: refundData.reason || '',
        refundedAt: new Date(),
        refundedBy: refundData.refundedBy,
        gatewayRefundId: refundData.gatewayRefundId
    };
    
    await this.save();
    return this;
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(startDate, endDate) {
    const matchStage = {};
    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    return stats;
};

module.exports = mongoose.model('Payment', paymentSchema);

