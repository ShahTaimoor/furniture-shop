const mongoose = require('mongoose');

const STATIC_PLACEMENTS = ['hero_0', 'hero_1', 'hero_2', 'hero_3', 'hero_4', 'hero_5'];

const isValidPlacement = (value = '') => {
  if (STATIC_PLACEMENTS.includes(value)) return true;
  return /^hero_\d+$/.test(value);
};

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ''
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 320
    },
    image: {
      secure_url: {
        type: String,
        required: true
      },
      public_id: {
        type: String,
        required: true
      }
    },
    redirectLink: {
      type: String,
      trim: true
    },
    placement: {
      type: String,
      required: true,
      index: true,
      validate: {
        validator: isValidPlacement,
        message: (props) => `${props.value} is not a valid placement`
      }
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Banner', bannerSchema);


