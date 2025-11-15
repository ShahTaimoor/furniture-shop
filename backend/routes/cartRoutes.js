const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { isAuthorized } = require('../middleware/authMiddleware');
const router = express.Router();

// Get current user's cart
router.get('/', isAuthorized, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart ? cart.items : [] });
});

// Add/update item in cart
router.post('/add', isAuthorized, async (req, res) => {
  const { productId, quantity, variationId } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ message: 'Product and quantity are required' });
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  let variation = null;
  if (variationId && Array.isArray(product.variations)) {
    variation = product.variations.id(variationId) || product.variations.find((v) => String(v._id) === String(variationId));
    if (!variation) {
      return res.status(400).json({ message: 'Selected variation not found' });
    }
  }

  const rawSalePrice =
    variation?.salePrice ??
    variation?.price ??
    product.salePrice ??
    product.price;
  const resolvedSalePrice = Number(rawSalePrice);
  const linePrice = Number.isFinite(resolvedSalePrice) ? resolvedSalePrice : 0;
  const lineImage = variation?.images?.[0] || product.images?.find((img) => img.isPrimary) || product.images?.[0] || product.picture;

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = new Cart({ user: req.user.id, items: [] });
  }

  const itemIndex = cart.items.findIndex((i) => {
    const isSameProduct = i.product.toString() === productId;
    const isSameVariation =
      (!variationId && !i.variationId) ||
      (variationId && i.variationId && String(i.variationId) === String(variationId));
    return isSameProduct && isSameVariation;
  });

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
    cart.items[itemIndex].price = linePrice;
    cart.items[itemIndex].salePrice = linePrice;
    cart.items[itemIndex].variationId = variation?._id || undefined;
    cart.items[itemIndex].variationSku = variation?.sku;
    cart.items[itemIndex].attributes = variation?.attributes || [];
    cart.items[itemIndex].image = lineImage
      ? { secure_url: lineImage.secure_url, public_id: lineImage.public_id }
      : cart.items[itemIndex].image;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      variationId: variation?._id || undefined,
      variationSku: variation?.sku,
      price: product.salePrice ?? product.price ?? 0,
      salePrice: linePrice,
      attributes: variation?.attributes || [],
      image: lineImage ? { secure_url: lineImage.secure_url, public_id: lineImage.public_id } : undefined,
    });
  }
  await cart.save();
  cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart.items });
});

// Remove item from cart
router.post('/remove', isAuthorized, async (req, res) => {
  const { productId, variationId } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.json({ items: [] });
  cart.items = cart.items.filter((i) => {
    const isSameProduct = i.product.toString() === productId;
    const isSameVariation =
      (!variationId && !i.variationId) ||
      (variationId && i.variationId && String(i.variationId) === String(variationId));
    return !(isSameProduct && isSameVariation);
  });
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
  const { productId, quantity, variationId } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const itemIndex = cart.items.findIndex((i) => {
    const isSameProduct = i.product.toString() === productId;
    const isSameVariation =
      (!variationId && !i.variationId) ||
      (variationId && i.variationId && String(i.variationId) === String(variationId));
    return isSameProduct && isSameVariation;
  });
  if (itemIndex === -1) return res.status(404).json({ message: 'Item not found in cart' });

  cart.items[itemIndex].quantity = quantity;
  cart.updatedAt = new Date();
  await cart.save();
  cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json({ items: cart.items });
});

module.exports = router;
