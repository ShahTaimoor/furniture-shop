const { query } = require('../config/postgres');
const productModel = require('../models/postgres/productModel');

const getOrCreateWishlist = async (userId) => {
  const { rows } = await query('select * from wishlists where user_id = $1', [userId]);
  if (rows[0]) return rows[0];
  const { rows: created } = await query(
    'insert into wishlists (user_id, items) values ($1, $2) returning *',
    [userId, JSON.stringify([])]
  );
  return created[0];
};

const saveWishlistItems = async (userId, items) => {
  const { rows } = await query('update wishlists set items = $2 where user_id = $1 returning *', [
    userId,
    JSON.stringify(items),
  ]);
  return rows[0];
};

const buildWishlistResponse = async (items) => {
  if (items.length === 0) return [];
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const { rows } = await query('select * from products where id = any($1::uuid[])', [productIds]);
  const productsById = new Map(rows.map((row) => [row.id, productModel.rowToProduct(row)]));

  return items
    .map((item) => {
      const product = productsById.get(item.productId);
      if (!product) return null;

      const variation = item.variantId
        ? (product.variations || []).find((v) => v.id === item.variantId)
        : null;

      const baseImage =
        variation?.images?.[0]?.secure_url ||
        product.primaryImage ||
        product.picture?.secure_url ||
        (product.images || []).find((img) => img?.secure_url)?.secure_url ||
        null;

      return {
        productId: product._id,
        variantId: item.variantId || null,
        title: variation?.name || product.title || product.name || 'Saved product',
        slug: product.slug || null,
        path: product.slug ? `/product/${product.slug}` : null,
        image: baseImage,
        price: typeof variation?.price === 'number' ? variation.price : typeof product.price === 'number' ? product.price : null,
        salePrice:
          typeof variation?.salePrice === 'number'
            ? variation.salePrice
            : typeof product.salePrice === 'number'
              ? product.salePrice
              : null,
        currency: 'GBP',
        stockStatus: variation?.stockStatus || product.stockStatus || null,
        addedAt: item.addedAt || new Date(),
      };
    })
    .filter(Boolean);
};

// @route GET /api/pg/wishlist
const getWishlist = async (req, res) => {
  try {
    const wishlist = await getOrCreateWishlist(req.user.id);
    const items = await buildWishlistResponse(wishlist.items || []);
    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('pg getWishlist error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load wishlist right now.' });
  }
};

// @route POST /api/pg/wishlist/add
const addToWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ success: false, message: 'A valid productId is required.' });
    }

    const productRow = await productModel.findRawById(productId);
    if (!productRow || productRow.is_deleted) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    const product = productModel.rowToProduct(productRow);

    let resolvedVariantId = null;
    if (variantId) {
      const variation = (product.variations || []).find((v) => v.id === variantId);
      if (!variation) {
        return res.status(400).json({ success: false, message: 'Selected variation was not found.' });
      }
      resolvedVariantId = variation.id;
    }

    const wishlist = await getOrCreateWishlist(req.user.id);
    const items = wishlist.items || [];

    const alreadyExists = items.some((item) => {
      const matchesProduct = item.productId === productId;
      const matchesVariant =
        (!resolvedVariantId && !item.variantId) || (resolvedVariantId && item.variantId === resolvedVariantId);
      return matchesProduct && matchesVariant;
    });

    if (alreadyExists) {
      const hydrated = await buildWishlistResponse(items);
      return res.status(200).json({ success: true, message: 'Product is already in your wishlist.', items: hydrated });
    }

    items.unshift({ productId, variantId: resolvedVariantId, addedAt: new Date() });
    await saveWishlistItems(req.user.id, items);

    const hydrated = await buildWishlistResponse(items);
    return res.status(200).json({ success: true, message: 'Product saved to wishlist.', items: hydrated });
  } catch (error) {
    console.error('pg addToWishlist error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save product to wishlist right now.' });
  }
};

// @route POST /api/pg/wishlist/remove
const removeFromWishlist = async (req, res) => {
  try {
    const { productId, variantId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ success: false, message: 'A valid productId is required.' });
    }

    const wishlist = await getOrCreateWishlist(req.user.id);
    const items = (wishlist.items || []).filter((item) => {
      const matchesProduct = item.productId === productId;
      const matchesVariant = (!variantId && !item.variantId) || (variantId && item.variantId === variantId);
      return !(matchesProduct && matchesVariant);
    });

    await saveWishlistItems(req.user.id, items);
    const hydrated = await buildWishlistResponse(items);
    return res.status(200).json({ success: true, message: 'Product removed from wishlist.', items: hydrated });
  } catch (error) {
    console.error('pg removeFromWishlist error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update wishlist right now.' });
  }
};

// @route POST /api/pg/wishlist/clear
const clearWishlist = async (req, res) => {
  try {
    await getOrCreateWishlist(req.user.id);
    await saveWishlistItems(req.user.id, []);
    return res.status(200).json({ success: true, message: 'Wishlist cleared.', items: [] });
  } catch (error) {
    console.error('pg clearWishlist error:', error);
    return res.status(500).json({ success: false, message: 'Unable to clear wishlist right now.' });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};
