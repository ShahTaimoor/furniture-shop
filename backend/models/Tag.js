const mongoose = require('mongoose');
const slugify = require('slugify');

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

tagSchema.pre('validate', function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    this.slug = baseSlug || this.slug || this._id.toString();
  }
  next();
});

module.exports = mongoose.model('Tag', tagSchema);

