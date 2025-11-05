// models/Order.js

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  amount: {
    type: String,
    required: true,
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
    type: Number,
    required: true,
  },
  
  products: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  paymentMethod: {
    type: String,
    enum: ['COD'],
    default: 'COD',
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending',
  },
   packerName: {
    type: String,
    default: ''
  },
  
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
