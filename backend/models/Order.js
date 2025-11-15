// models/Order.js

const mongoose = require('mongoose');

const orderProductSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    variation: {
      variationId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: { type: String, trim: true },
      sku: { type: String, trim: true },
      price: { type: Number, min: 0 },
      attributes: [
        {
          name: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],
    },
    image: {
      secure_url: String,
      public_id: String,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    products: [orderProductSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for guest orders
    },
    // Guest user information (for non-authenticated users)
    guestInfo: {
      name: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
          validator: function(v) {
            return !v || /^\S+@\S+\.\S+$/.test(v);
          },
          message: 'Please provide a valid email'
        }
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    isGuestOrder: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'CARD', 'BANK_TRANSFER', 'MOBILE_WALLET', 'STRIPE', 'PAYPAL', 'EASYPAISA', 'JAZZCASH'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    // Payment reference
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    // Coupon used
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    couponCode: {
      type: String,
      trim: true
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    // Shipping address (reference to Address model)
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address'
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: {
          type: String,
          trim: true,
        },
      },
    ],
    packerName: {
      type: String,
      default: '',
    },
    shippingProvider: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (!this.isModified('status')) {
    return next();
  }

  const history = this.statusHistory || [];
  const lastEntry = history[history.length - 1];

  if (!lastEntry || lastEntry.status !== this.status) {
    history.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this._statusChangedBy,
      note: this._statusChangeNote,
    });
  }

  this.statusHistory = history;
  this._statusChangedBy = undefined;
  this._statusChangeNote = undefined;

  next();
});

module.exports = mongoose.model('Order', orderSchema);
