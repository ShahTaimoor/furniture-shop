const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  variationId: { type: mongoose.Schema.Types.ObjectId },
  variationSku: { type: String, trim: true },
  price: { type: Number, min: 0 },
  salePrice: { type: Number, min: 0 },
  attributes: [
    {
      name: { type: String, trim: true },
      value: { type: String, trim: true },
    },
  ],
  image: {
    secure_url: String,
    public_id: String,
  },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cart', cartSchema);
