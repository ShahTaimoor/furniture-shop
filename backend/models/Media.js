const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true,
    unique: true
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  folder: {
    type: String,
    default: 'media'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for search functionality
mediaSchema.index({ name: 'text', originalName: 'text', description: 'text' });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);
