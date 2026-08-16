const { query } = require('../config/postgres');
const { CacheService } = require('../services/redisService');

// @route GET /api/pg/analytics/financial
const getFinancialSummary = async (req, res) => {
  try {
    const cacheKey = 'analytics:pg:financial';
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const { rows } = await query(
      'select cost_price, sale_price, discount, stock, total_sales from products where is_deleted = false'
    );

    const summary = rows.reduce(
      (acc, product) => {
        const cost = Number(product.cost_price) || 0;
        const sale = Number(product.sale_price) || 0;
        const discount = Number(product.discount) || 0;
        const stock = Number(product.stock) || 0;
        const sales = Number(product.total_sales) || 0;

        const inventoryCostValue = cost * stock;
        const inventorySaleValue = sale * stock;

        acc.totalProducts += 1;
        acc.totalCost += inventoryCostValue;
        acc.totalSalesValue += inventorySaleValue;
        acc.totalProfit += inventorySaleValue - inventoryCostValue;
        acc.totalRevenue += sale * sales;
        acc.realizedCost += cost * sales;
        acc.totalDiscount += discount;
        acc.totalStock += stock;
        acc.totalUnitsSold += sales;

        return acc;
      },
      {
        totalProducts: 0, totalCost: 0, totalSalesValue: 0, totalProfit: 0,
        totalDiscount: 0, totalStock: 0, totalUnitsSold: 0, totalRevenue: 0, realizedCost: 0,
      }
    );

    const averageDiscount = summary.totalProducts > 0 ? summary.totalDiscount / summary.totalProducts : 0;
    const realizedProfit = summary.totalRevenue - summary.realizedCost;
    const averageMargin =
      summary.totalRevenue > 0 ? ((summary.totalRevenue - summary.realizedCost) / summary.totalRevenue) * 100 : 0;

    const response = {
      success: true,
      data: {
        totalProducts: summary.totalProducts,
        totalCost: summary.totalCost,
        totalSalesValue: summary.totalSalesValue,
        totalProfit: summary.totalProfit,
        totalStock: summary.totalStock,
        totalUnitsSold: summary.totalUnitsSold,
        averageDiscount: Number.isFinite(averageDiscount) ? averageDiscount : 0,
        totalRevenue: summary.totalRevenue,
        realizedCost: summary.realizedCost,
        realizedProfit,
        averageMargin: Number.isFinite(averageMargin) ? averageMargin : 0,
      },
    };

    await CacheService.set(cacheKey, response, 900);
    return res.status(200).json(response);
  } catch (error) {
    console.error('pg getFinancialSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate analytics summary' });
  }
};

module.exports = {
  getFinancialSummary,
};
