const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    picture: {
      secure_url: { type: String, trim: true },
      public_id: { type: String, trim: true },
      alt: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

async function generateUniqueSlug(name, currentId = null) {
  let baseSlug = slugify(name || '', { lower: true, strict: true });
  if (!baseSlug) {
    baseSlug = new mongoose.Types.ObjectId().toString();
  }

  let slug = baseSlug;
  let counter = 1;

  // Keep generating a new slug until it is unique (excluding current document when updating)
  /* eslint-disable no-await-in-loop */
  while (
    await mongoose.models.Category.exists({
      slug,
      ...(currentId && { _id: { $ne: currentId } }),
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }
  /* eslint-enable no-await-in-loop */

  return slug;
}

categorySchema.pre('validate', async function preValidate(next) {
  if (!this.slug && this.name) {
    this.slug = await generateUniqueSlug(this.name, this._id);
  }
  next();
});

categorySchema.pre('save', async function preSave(next) {
  if (this.isModified('name')) {
    this.slug = await generateUniqueSlug(this.name, this._id);
  }
  next();
});

categorySchema.virtual('image').get(function getImage() {
  return this.picture?.secure_url || null;
});

module.exports = mongoose.model('Category', categorySchema);