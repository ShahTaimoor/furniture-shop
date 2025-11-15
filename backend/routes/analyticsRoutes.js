const express = require('express');
const Product = require('../models/Product');
const { isAuthorized, isSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/analytics/financial', isAuthorized, isSuperAdmin, async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false }).select(
      'costPrice salePrice discount stock totalSales'
    );

    const summary = products.reduce(
      (acc, product) => {
        const cost = Number(product.costPrice) || 0;
        const sale = Number(product.salePrice) || 0;
        const discount = Number(product.discount) || 0;
        const stock = Number(product.stock) || 0;
        const sales = Number(product.totalSales) || 0;

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
        totalProducts: 0,
        totalCost: 0,
        totalSalesValue: 0,
        totalProfit: 0,
        totalDiscount: 0,
        totalStock: 0,
        totalUnitsSold: 0,
        totalRevenue: 0,
        realizedCost: 0
      }
    );

    const averageDiscount =
      summary.totalProducts > 0 ? summary.totalDiscount / summary.totalProducts : 0;
    const realizedProfit = summary.totalRevenue - summary.realizedCost;
    const averageMargin =
      summary.totalRevenue > 0
        ? ((summary.totalRevenue - summary.realizedCost) / summary.totalRevenue) * 100
        : 0;

    return res.status(200).json({
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
        averageMargin: Number.isFinite(averageMargin) ? averageMargin : 0
      }
    });
  } catch (error) {
    console.error('Error generating analytics summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate analytics summary'
    });
  }
});

module.exports = router;


