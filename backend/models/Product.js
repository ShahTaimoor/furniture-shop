const mongoose = require('mongoose')
const slugify = require('slugify')

const imageSchema = new mongoose.Schema(
  {
    secure_url: { type: String },
    public_id: { type: String },
    alt: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    position: { type: Number, default: 0 },
    metadata: {
      width: { type: Number },
      height: { type: Number },
      size: { type: Number },
      format: { type: String },
    },
  },
  { _id: false }
);

const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    value: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const variationSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true },
    price: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    allowBackorder: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isDefault: { type: Boolean, default: false },
    attributes: { type: [attributeSchema], default: [] },
    images: { type: [imageSchema], default: [] },
    metadata: {
      weight: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      depth: { type: Number, min: 0 },
    },
  },
  { _id: true, timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  brand: {
    type: String,
    trim: true,
    index: true,
  },
  vendor: {
    type: String,
    trim: true,
  },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 280,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
    },
    stockStatus: {
      type: String,
      enum: ['in-stock', 'out-of-stock', 'backorder', 'preorder'],
      default: 'in-stock',
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 0,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    primaryCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    images: {
      type: [imageSchema],
      default: [],
    },
    picture: {
      secure_url: { type: String },
      public_id: { type: String },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft', 'archived'],
      default: 'active',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'hidden'],
      default: 'public',
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    saleStartDate: {
      type: Date,
    },
    saleEndDate: {
      type: Date,
    },
    attributes: {
      type: [attributeSchema],
      default: [],
    },
    variationAttributes: {
      type: [String],
      default: [],
    },
    variations: {
      type: [variationSchema],
      default: [],
    },
    shipping: {
      weight: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      depth: { type: Number, min: 0 },
      requiresShipping: { type: Boolean, default: true },
    },
    seo: {
      metaTitle: { type: String, trim: true },
      metaDescription: { type: String, trim: true, maxlength: 320 },
      keywords: { type: [String], default: [] },
      canonicalUrl: { type: String, trim: true },
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    flags: {
      type: [String],
      default: [],
    },
    minPurchaseQuantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    maxPurchaseQuantity: {
      type: Number,
      min: 1,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    inventoryHistory: [
      {
        quantity: { type: Number, required: true },
        reason: { type: String, trim: true },
        reference: { type: String, trim: true },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual('primaryImage').get(function () {
  if (!this.images || this.images.length === 0) {
    return this.picture?.secure_url || null;
  }
  const primary = this.images.find((image) => image.isPrimary);
  return (primary && primary.secure_url) || this.images[0]?.secure_url || this.picture?.secure_url || null;
});

productSchema.virtual('totalInventory').get(function () {
  const numericSalePrice = Number.isFinite(this.salePrice)
    ? this.salePrice
    : Number.isFinite(this.price)
      ? this.price
      : 0;
  this.salePrice = Math.max(numericSalePrice, 0);
  this.price = this.salePrice;

  if (!Number.isFinite(this.costPrice) || this.costPrice < 0) {
    this.costPrice = 0;
  }

  if (!Number.isFinite(this.discount) || this.discount < 0) {
    this.discount = 0;
  }

  if (this.salePrice > 0 && (!this.isModified('discount') || this.discount === 0)) {
    const grossMargin = ((this.salePrice - this.costPrice) / this.salePrice) * 100;
    if (Number.isFinite(grossMargin) && grossMargin > 0) {
      this.discount = Math.min(100, Math.max(0, grossMargin));
    } else {
      this.discount = 0;
    }
  } else if (this.discount > 100) {
    this.discount = 100;
  }

  if (Array.isArray(this.variations) && this.variations.length > 0) {
    return this.variations.reduce((acc, variation) => acc + (variation.stock || 0), 0);
  }
  return this.stock || 0;
});

productSchema.pre('save', async function (next) {
  const hasNameFieldChanged = this.isModified('title') || this.isModified('name');
  const Product = mongoose.model('Product');

  if (hasNameFieldChanged) {
    const baseValue = this.title || this.name || '';
    let baseSlug = slugify(baseValue, { lower: true, strict: true });
    if (!baseSlug) {
      baseSlug = this._id.toString();
    }

    let slug = baseSlug;
    let counter = 1;

    while (await Product.exists({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }

  if (!this.name && this.title) {
    this.name = this.title;
  } else if (!this.title && this.name) {
    this.title = this.name;
  }

  if (Array.isArray(this.variations) && this.variations.length > 0) {
    this.stock = this.variations.reduce((acc, variation) => acc + (variation.stock || 0), 0);
  }

  if (this.stock <= 0 && !this.allowBackorder) {
    this.stockStatus = 'out-of-stock';
  } else if (this.stock > 0 && this.stock <= this.lowStockThreshold) {
    this.stockStatus = 'backorder';
  } else if (this.stock > 0) {
    this.stockStatus = 'in-stock';
  }

  if (this.isOnSale && this.saleEndDate && this.saleStartDate && this.saleEndDate < this.saleStartDate) {
    return next(new Error('Sale end date cannot be earlier than sale start date'));
  }

  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  } else if (!this.isDeleted) {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
  }

  return next();
});

// Create text indexes for better search performance
productSchema.index({
  title: 'text',
  name: 'text',
  description: 'text',
  sku: 'text',
  brand: 'text',
  'attributes.name': 'text',
  'attributes.value': 'text',
  'variations.name': 'text',
  'variations.sku': 'text',
  'variations.attributes.name': 'text',
  'variations.attributes.value': 'text',
}, {
  weights: {
    title: 10,
    name: 8,
    description: 5,
    sku: 9,
    'attributes.name': 4,
    'attributes.value': 4,
    'variations.name': 6,
  },
  name: 'product_search_index'
});

productSchema.index({ categories: 1, status: 1, stock: 1 });
productSchema.index({ tags: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isBestseller: 1 });
productSchema.index({ isOnSale: 1, saleEndDate: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ stockStatus: 1 });
productSchema.index({ isDeleted: 1, deletedAt: 1 });
productSchema.index({ brand: 1 });

module.exports = mongoose.model('Product', productSchema)