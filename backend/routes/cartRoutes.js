const express = require('express');
const Cart = require('../models/Cart');
const { isAuthorized } = require('../middleware/authMiddleware');
const router = express.Router();

// Get current user's cart
router.get('/', isAuthorized, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart ? cart.items : [] });
});

// Add/update item in cart
router.post('/add', isAuthorized, async (req, res) => {
  const { productId, quantity } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = new Cart({ user: req.user.id, items: [] });
  }
  const itemIndex = cart.items.findIndex(i => i.product.toString() === productId);
  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }
  await cart.save();
  cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart.items });
});

// Remove item from cart
router.post('/remove', isAuthorized, async (req, res) => {
  const { productId } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.json({ items: [] });
  cart.items = cart.items.filter(i => i.product.toString() !== productId);
  cart.updatedAt = new Date();
  await cart.save();
  cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart.items });
});

// Empty cart
router.post('/empty', isAuthorized, async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id });
  if (cart) {
    cart.items = [];
    cart.updatedAt = new Date();
    await cart.save();
  }
  res.json({ items: [] });
});

// Update quantity of an item in cart
router.post('/update', isAuthorized, async (req, res) => {
  const { productId, quantity } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const itemIndex = cart.items.findIndex(i => i.product.toString() === productId);
  if (itemIndex === -1) return res.status(404).json({ message: 'Item not found in cart' });

  cart.items[itemIndex].quantity = quantity;
  cart.updatedAt = new Date();
  await cart.save();
  cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart.items });
});

module.exports = router;
