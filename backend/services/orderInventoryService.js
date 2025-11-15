const Product = require('../models/Product');

const restoreInventoryForOrder = async (order, { reason = 'order_cancelled', userId } = {}) => {
  if (!order || !Array.isArray(order.products)) return;

  for (const item of order.products) {
    const productId = item?.id?._id || item?.id;
    if (!productId) continue;

    const product = await Product.findById(productId);
    if (!product) continue;

    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    if (item.variation?.variationId && Array.isArray(product.variations)) {
      const variation =
        product.variations.id(item.variation.variationId) ||
        product.variations.find(
          (variant) => variant._id && String(variant._id) === String(item.variation.variationId)
        );
      if (variation) {
        variation.stock = (variation.stock || 0) + quantity;
        product.markModified('variations');
      }
    } else {
      product.stock = (product.stock || 0) + quantity;
    }

    product.totalSales = Math.max((product.totalSales || 0) - quantity, 0);
    product.inventoryHistory = product.inventoryHistory || [];
    product.inventoryHistory.push({
      quantity,
      reason,
      reference: `ORDER:${order._id}`,
      createdBy: userId,
    });

    await product.save();
  }
};

module.exports = {
  restoreInventoryForOrder,
};

