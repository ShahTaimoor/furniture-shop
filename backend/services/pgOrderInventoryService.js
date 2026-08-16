const productModel = require('../models/postgres/productModel');

const restoreInventoryForOrder = async (order) => {
  if (!order || !Array.isArray(order.products)) return;

  for (const item of order.products) {
    const productId = item?.id;
    if (!productId) continue;

    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    // eslint-disable-next-line no-await-in-loop
    await productModel.restoreStockForOrderItem(productId, quantity, {
      variationId: item.variation?.variationId,
    });
  }
};

module.exports = {
  restoreInventoryForOrder,
};
