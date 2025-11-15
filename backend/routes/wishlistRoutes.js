const express = require('express');
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { isAuthorized } = require('../middleware/authMiddleware');

const router = express.Router();

const normalizeWishlistItem = (item) => {
  if (!item) return null;

  const productDoc = item.product;
  if (!productDoc) {
    return null;
  }

  const product = productDoc.toObject ? productDoc.toObject() : productDoc;
  const variantId = item.variantId ? item.variantId.toString() : null;

  const selectedVariation =
    variantId && Array.isArray(product.variations)
      ? product.variations.find((variation) => variation && variation._id && variation._id.toString() === variantId)
      : null;

  const baseImage =
    selectedVariation?.images?.[0]?.secure_url ||
    product.primaryImage ||
    product.picture?.secure_url ||
    product.images?.find?.((image) => image?.secure_url)?.secure_url ||
    null;

  return {
    productId: product._id?.toString?.() || productDoc._id?.toString?.() || item.product.toString(),
    variantId,
    title: selectedVariation?.name || product.title || product.name || 'Saved product',
    slug: product.slug || null,
    path: product.slug ? `/product/${product.slug}` : null,
    image: baseImage,
    price:
      typeof selectedVariation?.price === 'number'
        ? selectedVariation.price
        : typeof product.price === 'number'
          ? product.price
          : null,
    salePrice:
      typeof selectedVariation?.salePrice === 'number'
        ? selectedVariation.salePrice
        : typeof product.salePrice === 'number'
          ? product.salePrice
          : null,
    currency: product.currency || 'GBP',
    stockStatus: selectedVariation?.stockStatus || product.stockStatus || null,
    addedAt: item.addedAt || new Date(),
  };
};

const buildWishlistResponse = (wishlist) => {
  if (!wishlist || !Array.isArray(wishlist.items)) {
    return [];
  }

  return wishlist.items
    .map((item) => normalizeWishlistItem(item))
    .filter(Boolean);
};

const resolveWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'title slug price salePrice picture images stockStatus variations currency primaryImage',
  });

  if (!wishlist) {
    return null;
  }

  return wishlist;
};

router.get('/wishlist', isAuthorized, async (req, res) => {
  try {
    const wishlist = await resolveWishlist(req.user.id);

    return res.status(200).json({
      success: true,
      items: buildWishlistResponse(wishlist),
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load wishlist right now.',
    });
  }
});

router.post('/wishlist/add', isAuthorized, async (req, res) => {
  try {
    const { productId, variantId } = req.body || {};

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid productId is required.',
      });
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false })
      .select('title slug price salePrice picture images stockStatus variations currency primaryImage');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    let resolvedVariantId = null;
    if (variantId) {
      if (!mongoose.Types.ObjectId.isValid(variantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid variantId provided.',
        });
      }
      const variation = product.variations?.find(
        (entry) => entry && entry._id && entry._id.toString() === variantId
      );
      if (!variation) {
        return res.status(400).json({
          success: false,
          message: 'Selected variation was not found.',
        });
      }
      resolvedVariantId = variation._id;
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, items: [] });
    }

    const alreadyExists = wishlist.items.some((item) => {
      const matchesProduct = item.product.toString() === productId;
      const matchesVariant =
        (!resolvedVariantId && !item.variantId) ||
        (resolvedVariantId && item.variantId && item.variantId.toString() === resolvedVariantId.toString());
      return matchesProduct && matchesVariant;
    });

    if (alreadyExists) {
      await wishlist.populate({
        path: 'items.product',
        select: 'title slug price salePrice picture images stockStatus variations currency primaryImage',
      });

      return res.status(200).json({
        success: true,
        message: 'Product is already in your wishlist.',
        items: buildWishlistResponse(wishlist),
      });
    }

    wishlist.items.unshift({
      product: product._id,
      variantId: resolvedVariantId || undefined,
      addedAt: new Date(),
    });

    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'title slug price salePrice picture images stockStatus variations currency primaryImage',
    });

    return res.status(200).json({
      success: true,
      message: 'Product saved to wishlist.',
      items: buildWishlistResponse(wishlist),
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save product to wishlist right now.',
    });
  }
});

router.post('/wishlist/remove', isAuthorized, async (req, res) => {
  try {
    const { productId, variantId } = req.body || {};

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid productId is required.',
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: 'Wishlist updated.',
        items: [],
      });
    }

    wishlist.items = wishlist.items.filter((item) => {
      const matchesProduct = item.product.toString() === productId;
      const matchesVariant =
        (!variantId && !item.variantId) ||
        (variantId && item.variantId && item.variantId.toString() === variantId.toString());
      return !(matchesProduct && matchesVariant);
    });

    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'title slug price salePrice picture images stockStatus variations currency primaryImage',
    });

    return res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
      items: buildWishlistResponse(wishlist),
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update wishlist right now.',
    });
  }
});

router.post('/wishlist/clear', isAuthorized, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (wishlist) {
      wishlist.items = [];
      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Wishlist cleared.',
      items: [],
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to clear wishlist right now.',
    });
  }
});

module.exports = router;

