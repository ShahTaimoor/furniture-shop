const mongoose = require('mongoose');

const { Schema } = mongoose;

const wishlistItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Product.variations',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

wishlistItemSchema.index({ product: 1, variantId: 1 }, { unique: false });

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);

