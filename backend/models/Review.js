const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        trim: true,
        maxlength: 120
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    // Review photos
    photos: [{
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
        alt: { type: String, trim: true },
        position: { type: Number, default: 0 }
    }],
    // Review approval status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    // Approved/rejected by admin
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    // Rejection reason (if rejected)
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // Flagged for moderation
    flaggedReason: {
        type: String,
        trim: true
    },
    // Helpful count (users who found this review helpful)
    helpfulCount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Users who marked as helpful
    helpfulBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    adminResponse: {
        message: {
            type: String,
            trim: true,
            maxlength: 2000
        },
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: {
            type: Date
        }
    }
}, { timestamps: true })

reviewSchema.index({ product: 1, user: 1 }, { unique: true })

reviewSchema.statics.calculateProductRating = async function (productId) {
    const Product = mongoose.model('Product')

    const stats = await this.aggregate([
        { $match: { product: productId } },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                ratingCount: { $sum: 1 }
            }
        }
    ])

    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            ratingAverage: Number(stats[0].averageRating.toFixed(2)),
            ratingCount: stats[0].ratingCount
        })
    } else {
        await Product.findByIdAndUpdate(productId, {
            ratingAverage: 0,
            ratingCount: 0
        })
    }
}

reviewSchema.pre('save', function (next) {
    if (!this.isNew && this.isModified()) {
        this.isEdited = true
    }
    next()
})

reviewSchema.post('save', function () {
    this.constructor.calculateProductRating(this.product)
})

reviewSchema.post('findOneAndUpdate', function (doc) {
    if (doc) {
        doc.constructor.calculateProductRating(doc.product)
    }
})

reviewSchema.post('findOneAndDelete', function (doc) {
    if (doc) {
        doc.constructor.calculateProductRating(doc.product)
    }
})

reviewSchema.post('findOneAndRemove', function (doc) {
    if (doc) {
        doc.constructor.calculateProductRating(doc.product)
    }
})

module.exports = mongoose.model('Review', reviewSchema)

