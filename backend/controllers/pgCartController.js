const { query } = require('../config/postgres');
const productModel = require('../models/postgres/productModel');

const getOrCreateCart = async (userId) => {
  const { rows } = await query('select * from carts where user_id = $1', [userId]);
  if (rows[0]) return rows[0];
  const { rows: created } = await query(
    'insert into carts (user_id, items) values ($1, $2) returning *',
    [userId, JSON.stringify([])]
  );
  return created[0];
};

const saveCartItems = async (userId, items) => {
  const { rows } = await query(
    `update carts set items = $2 where user_id = $1 returning *`,
    [userId, JSON.stringify(items)]
  );
  return rows[0];
};

// Hydrate cart line items against the live products table (mirrors Mongo's .populate()).
const hydrateCartItems = async (items) => {
  if (items.length === 0) return [];
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const { rows } = await query('select * from products where id = any($1::uuid[])', [productIds]);
  const productsById = new Map(rows.map((row) => [row.id, productModel.rowToProduct(row)]));

  return items
    .map((item) => {
      const product = productsById.get(item.productId);
      if (!product) return null;

      const variation = item.variationId
        ? (product.variations || []).find((v) => v.id === item.variationId)
        : null;

      return {
        product: { ...product, _id: product._id },
        quantity: item.quantity,
        variationId: item.variationId || null,
        variationSku: item.variationSku || variation?.sku || null,
        price: item.price,
        salePrice: item.salePrice,
        attributes: item.attributes || [],
        image: item.image || null,
      };
    })
    .filter(Boolean);
};

// @route GET /api/pg/cart
const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const items = await hydrateCartItems(cart.items || []);
    res.json({ items });
  } catch (error) {
    console.error('pg getCart error:', error);
    res.status(500).json({ message: 'Server error while fetching cart' });
  }
};

// @route POST /api/pg/cart/add
const addToCart = async (req, res) => {
  try {
    const { productId, quantity, variationId } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ message: 'Product and quantity are required' });
    }

    const productRow = await productModel.findRawById(productId);
    if (!productRow || productRow.is_deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = productModel.rowToProduct(productRow);

    let variation = null;
    if (variationId) {
      variation = (product.variations || []).find((v) => v.id === variationId);
      if (!variation) {
        return res.status(400).json({ message: 'Selected variation not found' });
      }
    }

    const rawSalePrice = variation?.salePrice ?? variation?.price ?? product.salePrice ?? product.price;
    const resolvedSalePrice = Number(rawSalePrice);
    const linePrice = Number.isFinite(resolvedSalePrice) ? resolvedSalePrice : 0;
    const lineImage =
      variation?.images?.[0] ||
      (product.images || []).find((img) => img.isPrimary) ||
      (product.images || [])[0] ||
      product.picture;

    const cart = await getOrCreateCart(req.user.id);
    const items = cart.items || [];

    const itemIndex = items.findIndex((i) => {
      const isSameProduct = i.productId === productId;
      const isSameVariation =
        (!variationId && !i.variationId) || (variationId && i.variationId === variationId);
      return isSameProduct && isSameVariation;
    });

    if (itemIndex > -1) {
      items[itemIndex].quantity += quantity;
      items[itemIndex].price = linePrice;
      items[itemIndex].salePrice = linePrice;
      items[itemIndex].variationId = variation?.id || null;
      items[itemIndex].variationSku = variation?.sku || null;
      items[itemIndex].attributes = variation?.attributes || [];
      items[itemIndex].image = lineImage ? { secure_url: lineImage.secure_url, public_id: lineImage.public_id } : items[itemIndex].image;
    } else {
      items.push({
        productId,
        quantity,
        variationId: variation?.id || null,
        variationSku: variation?.sku || null,
        price: product.salePrice ?? product.price ?? 0,
        salePrice: linePrice,
        attributes: variation?.attributes || [],
        image: lineImage ? { secure_url: lineImage.secure_url, public_id: lineImage.public_id } : null,
      });
    }

    await saveCartItems(req.user.id, items);
    const hydrated = await hydrateCartItems(items);
    res.json({ items: hydrated });
  } catch (error) {
    console.error('pg addToCart error:', error);
    res.status(500).json({ message: 'Server error while adding to cart' });
  }
};

// @route POST /api/pg/cart/remove
const removeFromCart = async (req, res) => {
  try {
    const { productId, variationId } = req.body;
    const cart = await getOrCreateCart(req.user.id);
    const items = (cart.items || []).filter((i) => {
      const isSameProduct = i.productId === productId;
      const isSameVariation =
        (!variationId && !i.variationId) || (variationId && i.variationId === variationId);
      return !(isSameProduct && isSameVariation);
    });

    await saveCartItems(req.user.id, items);
    const hydrated = await hydrateCartItems(items);
    res.json({ items: hydrated });
  } catch (error) {
    console.error('pg removeFromCart error:', error);
    res.status(500).json({ message: 'Server error while removing from cart' });
  }
};

// @route POST /api/pg/cart/empty
const emptyCart = async (req, res) => {
  try {
    await getOrCreateCart(req.user.id);
    await saveCartItems(req.user.id, []);
    res.json({ items: [] });
  } catch (error) {
    console.error('pg emptyCart error:', error);
    res.status(500).json({ message: 'Server error while emptying cart' });
  }
};

// @route POST /api/pg/cart/update
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity, variationId } = req.body;
    const cart = await getOrCreateCart(req.user.id);
    const items = cart.items || [];

    const itemIndex = items.findIndex((i) => {
      const isSameProduct = i.productId === productId;
      const isSameVariation =
        (!variationId && !i.variationId) || (variationId && i.variationId === variationId);
      return isSameProduct && isSameVariation;
    });
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    items[itemIndex].quantity = quantity;
    await saveCartItems(req.user.id, items);
    const hydrated = await hydrateCartItems(items);
    res.json({ items: hydrated });
  } catch (error) {
    console.error('pg updateCartItem error:', error);
    res.status(500).json({ message: 'Server error while updating cart' });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  emptyCart,
  updateCartItem,
};
