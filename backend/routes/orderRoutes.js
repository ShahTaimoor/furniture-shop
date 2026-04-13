const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Address = require('../models/Address');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { isAdmin, isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const { restoreInventoryForOrder } = require('../services/orderInventoryService');
const {
  updateOrderStatus: updateOrderStatusService,
  updateDriverLocation: updateDriverLocationService,
  getTrackableOrderForUser,
  serializeTrackingResponse,
} = require('../services/orderTrackingService');
const { emitOrderStatusUpdate, emitDriverLocationUpdate } = require('../socket/orderTracking');
const { CacheService, PendingOrdersCounter } = require('../services/redisService');

const router = express.Router();

// @route POST /api/order/guest
// @desc Place a guest order (without authentication)
// @access Public
router.post('/order/guest', async (req, res) => {
  try {
    const {
      products,
      address,
      amount,
      phone,
      city,
      name, // Guest name
      email, // Guest email
      notes,
      paymentMethod = 'COD',
      paymentStatus,
      metadata = {},
      couponCode,
      deliveryOption = 'standard', // standard, express
    } = req.body;

    // Validate guest information
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No products provided' });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }

    const orderProducts = [];
    let calculatedAmount = 0;

    for (const item of products) {
      if (!item?.id || !item?.quantity) {
        return res.status(400).json({ success: false, message: 'Invalid product item in order' });
      }

      const product = await Product.findOne({ _id: item.id, isDeleted: false, status: 'active' });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.id}` });
      }

      // Check stock
      if (product.stock <= 0) {
        return res.status(400).json({ success: false, message: `Product "${product.title}" is out of stock` });
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for product: ${product.title}` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for "${product.title}". Available: ${product.stock}, Requested: ${quantity}`,
        });
      }

      const basePrice = product.salePrice ?? product.price ?? 0;
      const linePrice = Number(basePrice) || 0;
      const lineTotal = linePrice * quantity;
      calculatedAmount += lineTotal;

      // Update product stock
      product.stock = Math.max((product.stock || 0) - quantity, 0);
      product.totalSales = (product.totalSales || 0) + quantity;
      await product.save();

      orderProducts.push({
        id: product._id,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        image: {
          secure_url: product.picture?.secure_url || product.image || null,
          public_id: product.picture?.public_id || null,
        },
      });
    }

    let totalAmount = Number.isFinite(Number(amount)) ? Number(amount) : calculatedAmount;
    let discountAmount = 0;
    let coupon = null;

    // Apply coupon if provided (guest orders can use coupons)
    if (couponCode) {
      try {
        coupon = await Coupon.findOne({ 
          code: couponCode.toUpperCase().trim(),
          status: 'active'
        });

        if (coupon && coupon.isValid) {
          // For guest orders, check if coupon allows first-time users
          if (coupon.firstTimeUserOnly) {
            // Check if email has been used before
            const existingOrder = await Order.findOne({ 
              'guestInfo.email': email.toLowerCase().trim() 
            });
            if (existingOrder) {
              return res.status(400).json({ 
                success: false, 
                message: 'This coupon is only valid for first-time customers' 
              });
            }
          }

          const discountResult = coupon.calculateDiscount(totalAmount);
          if (discountResult.valid) {
            discountAmount = discountResult.discountAmount;
            totalAmount = discountResult.finalAmount;
          }
        }
      } catch (couponError) {
        console.error('Coupon application error:', couponError);
      }
    }

    // Calculate shipping cost based on delivery option
    const shippingCost = deliveryOption === 'express' ? 500 : 0; // Express delivery fee
    totalAmount += shippingCost;

    // Create guest order
    const order = await Order.create({
      amount: Number(totalAmount.toFixed(2)),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      notes: notes || '',
      products: orderProducts,
      userId: null, // Guest order
      guestInfo: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
      },
      isGuestOrder: true,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus: paymentStatus || (paymentMethod === 'COD' ? 'pending' : 'pending'),
      coupon: coupon?._id || null,
      couponCode: coupon?.code || null,
      discountAmount: Number(discountAmount.toFixed(2)),
      metadata: {
        ...metadata,
        deliveryOption,
        shippingCost,
      },
    });

    // Increment pending orders counter in memory store
    if (order.status === 'pending') {
      await PendingOrdersCounter.increment();
    }

    // Create notification for admin
    try {
      await Notification.create({
        user: null, // Admin notification
        type: 'order_placed',
        title: 'New Guest Order',
        message: `New guest order #${order._id} placed by ${name}`,
        priority: 'high',
        relatedEntity: {
          type: 'order',
          id: order._id,
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // TODO: Send confirmation email to guest
    // This would typically be done via an email service
    // sendGuestOrderConfirmationEmail(order);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        _id: order._id,
        amount: order.amount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        guestInfo: order.guestInfo,
      },
    });
  } catch (error) {
    console.error('Guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while placing order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route POST /api/order
// @desc Place a new order (for authenticated users)
// @access Private

router.post('/order', isAuthorized, async (req, res) => {
  try {
    const {
      products,
      address,
      amount,
      phone,
      city,
      notes,
      paymentMethod = 'COD',
      paymentStatus,
      metadata = {},
      couponCode,
      shippingAddressId,
    } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No products provided' });
    }

    const orderProducts = [];
    let calculatedAmount = 0;

    for (const item of products) {
      if (!item?.id || !item?.quantity) {
        return res.status(400).json({ success: false, message: 'Invalid product item in order' });
      }

      const product = await Product.findOne({ _id: item.id, isDeleted: false });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.id}` });
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for product: ${product.title}` });
      }

      let variation = null;
      if (item.variationId && product.variations && product.variations.length > 0) {
        variation = product.variations.id(item.variationId);
      }

      if (!variation && item.variationSku && product.variations && product.variations.length > 0) {
        variation = product.variations.find((variant) => variant.sku && variant.sku === item.variationSku);
      }

      if (variation) {
        if (variation.status !== 'active') {
          return res.status(400).json({ success: false, message: `Selected variation is inactive for product: ${product.title}` });
        }

        if ((variation.stock ?? 0) < quantity && !variation.allowBackorder && !product.allowBackorder) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${product.title} (${variation.name}). Available: ${variation.stock}`,
          });
        }

        variation.stock = Math.max((variation.stock ?? 0) - quantity, 0);
      } else {
        if ((product.stock ?? 0) < quantity && !product.allowBackorder) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for product: ${product.title}`,
          });
        }
        product.stock = Math.max((product.stock ?? 0) - quantity, 0);
      }

      const basePrice = variation?.price ?? variation?.salePrice ?? product.salePrice ?? product.price;
      const linePrice = Number(basePrice) || 0;
      const lineTotal = linePrice * quantity;
      calculatedAmount += lineTotal;

      product.totalSales = (product.totalSales || 0) + quantity;
      product.inventoryHistory = product.inventoryHistory || [];
      product.inventoryHistory.push({
        quantity: -quantity,
        reason: 'order_placement',
        reference: 'ORDER_PENDING',
        createdBy: req.user?._id,
      });

      if (variation) {
        product.markModified('variations');
      }

      await product.save();

      orderProducts.push({
        id: product._id,
        title: product.title,
        slug: product.slug,
        sku: variation?.sku || product.sku,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        variation: variation
          ? {
              variationId: variation._id,
              name: variation.name,
              sku: variation.sku,
              price: variation.price,
              attributes: variation.attributes,
            }
          : undefined,
        image: {
          secure_url: variation?.images?.[0]?.secure_url || product.primaryImage || product.picture?.secure_url || null,
          public_id: variation?.images?.[0]?.public_id || product.picture?.public_id || null,
        },
      });
    }

    let totalAmount = Number.isFinite(Number(amount)) ? Number(amount) : calculatedAmount;
    let discountAmount = 0;
    let coupon = null;

    // Apply coupon if provided
    if (couponCode) {
      try {
        coupon = await Coupon.findOne({ 
          code: couponCode.toUpperCase().trim(),
          status: 'active'
        });

        if (coupon && coupon.isValid) {
          const isFirstTimeUser = !(await Order.findOne({ userId: req.user.id }));
          const canUse = coupon.canBeUsedBy(req.user.id, isFirstTimeUser);
          
          if (canUse.valid) {
            const discountResult = coupon.calculateDiscount(totalAmount);
            if (discountResult.valid) {
              discountAmount = discountResult.discountAmount;
              totalAmount = discountResult.finalAmount;
            }
          }
        }
      } catch (couponError) {
        console.error('Coupon application error:', couponError);
        // Continue without coupon if there's an error
      }
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get shipping address if provided
    let shippingAddress = null;
    if (shippingAddressId) {
      shippingAddress = await Address.findOne({
        _id: shippingAddressId,
        user: req.user.id,
        isActive: true
      });
    }

    // Use shipping address details if available, otherwise use provided address
    // If still empty, use user's saved address (required by Order model)
    const finalAddress = shippingAddress 
      ? shippingAddress.getFullAddress()
      : (address || user.address || '');
    const finalPhone = shippingAddress?.phone || phone || user.phone || '';
    const finalCity = shippingAddress?.city || city || user.city || '';

    // Validate that we have required address fields (Order model requires them)
    if (!finalAddress || !finalAddress.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shipping address is required. Please update your profile or provide a shipping address.' 
      });
    }
    if (!finalCity || !finalCity.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'City is required. Please update your profile or provide a city.' 
      });
    }
    if (!finalPhone || !finalPhone.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required. Please update your profile or provide a phone number.' 
      });
    }

    let updatedUser = false;

    if (!user.address && address) {
      user.address = address;
      updatedUser = true;
    }

    if (!user.phone && phone) {
      user.phone = phone;
      updatedUser = true;
    }

    if (!user.city && city) {
      user.city = city;
      updatedUser = true;
    }

    if (updatedUser) {
      await user.save();
    }

    const computedPaymentStatus =
      paymentStatus ||
      (paymentMethod === 'CARD' ? 'paid' : paymentMethod === 'BANK_TRANSFER' ? 'pending' : 'pending');

    const orderMetadata =
      metadata && typeof metadata === 'object' ? metadata : {};

    const newOrder = new Order({
      products: orderProducts,
      userId: req.user.id,
      address: finalAddress,
      phone: String(finalPhone),
      city: finalCity,
      amount: totalAmount,
      discountAmount: discountAmount,
      coupon: coupon?._id,
      couponCode: coupon?.code,
      shippingAddress: shippingAddress?._id,
      paymentMethod,
      paymentStatus: computedPaymentStatus,
      status: 'pending',
      notes,
      metadata: orderMetadata,
    });

    const savedOrder = await newOrder.save();

    // Increment pending orders counter in memory store
    if (savedOrder.status === 'pending') {
      await PendingOrdersCounter.increment();
    }

    // Record coupon usage if applicable
    if (coupon && discountAmount > 0) {
      await coupon.recordUsage(req.user.id, savedOrder._id);
    }

    // Create payment record for non-COD orders
    if (paymentMethod !== 'COD' && paymentMethod !== 'cod') {
      const payment = await Payment.create({
        order: savedOrder._id,
        user: req.user.id,
        paymentMethod: paymentMethod.toUpperCase(),
        amount: totalAmount,
        status: computedPaymentStatus === 'paid' ? 'completed' : 'pending',
        gatewayName: paymentMethod.toLowerCase(),
        description: `Payment for order #${savedOrder._id}`
      });
      
      savedOrder.payment = payment._id;
      await savedOrder.save();
    }

    // Create notification for order confirmation
    try {
      await Notification.createNotification({
        user: req.user.id,
        type: 'order_confirmation',
        title: 'Order Confirmed',
        message: `Your order #${savedOrder._id} has been confirmed. Total amount: PKR ${totalAmount}`,
        priority: 'high',
        relatedEntity: {
          type: 'order',
          id: savedOrder._id
        },
        action: {
          label: 'View Order',
          url: `/orders/${savedOrder._id}`
        }
      });
    } catch (notifError) {
      console.error('Notification creation error:', notifError);
      // Don't fail the order if notification fails
    }

    const populatedOrder = await Order.findById(savedOrder._id)
      .populate({
        path: 'products.id',
        select: 'title price picture slug',
      })
      .populate('userId', 'name email');

    return res.status(201).json({ success: true, data: populatedOrder });
  } catch (error) {
    console.error('COD Order Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});


// Add this route to your existing orderRoutes.js file

// @route PUT /api/orders/:id/status
// @desc Update order status
// @access Admin
const handleOrderStatusUpdate = async (req, res) => {
  try {
    const { status, packerName, paymentStatus, note } = req.body || {};
    const { id } = req.params;

    // Get old order status for counter update
    const oldOrder = await Order.findById(id);
    const oldStatus = oldOrder?.status;

    const updatedOrder = await updateOrderStatusService({
      orderId: id,
      status,
      packerName,
      paymentStatus,
      note,
      user: req.user,
    });

    // Update pending orders counter in memory store
    if (oldStatus === 'pending' && status !== 'pending') {
      await PendingOrdersCounter.decrement();
    } else if (oldStatus !== 'pending' && status === 'pending') {
      await PendingOrdersCounter.increment();
    }

    // Invalidate admin stats cache
    await CacheService.invalidate('analytics:*');
    await CacheService.invalidate('metrics:*');

    const trackingPayload = serializeTrackingResponse(updatedOrder);
    emitOrderStatusUpdate(trackingPayload);

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
      tracking: trackingPayload,
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

router.patch('/orders/:id/status', isAuthorized, isAdminOrSuperAdmin, handleOrderStatusUpdate);
router.put('/update-order-status/:id', isAuthorized, isAdminOrSuperAdmin, handleOrderStatusUpdate);

router.patch('/orders/:id/location', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    const { id } = req.params;

    const updatedOrder = await updateDriverLocationService({
      orderId: id,
      lat: Number(lat),
      lng: Number(lng),
    });

    const trackingPayload = serializeTrackingResponse(updatedOrder);
    emitDriverLocationUpdate({
      orderId: trackingPayload.orderId,
      location: trackingPayload.location,
    });

    return res.status(200).json({
      success: true,
      message: 'Driver location updated successfully',
      data: updatedOrder,
      tracking: trackingPayload,
    });
  } catch (error) {
    console.error('Update Location Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
});

router.get('/orders/:id/track', isAuthorized, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getTrackableOrderForUser({ orderId: id, user: req.user });
    const trackingPayload = serializeTrackingResponse(order);

    return res.status(200).json({
      success: true,
      data: trackingPayload,
    });
  } catch (error) {
    console.error('Track Order Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
});

// @route GET /api/orders/my-orders
// @desc Get logged-in user's orders
// @access Private

router.get('/get-orders-by-user-id', isAuthorized, async (req, res) => {
  const userId = req.user.id;

  try {
    const orders = await Order.find({ userId }).populate({
      path: 'products.id',
      select: "title price category picture"
    });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route GET /api/orders/get-all-orders
// @desc Get all orders (Admin only)
// @access Admin

// GET: All Orders with Pagination
router.get('/get-all-orders', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const orders = await Order.find()
      .populate({
        path: 'products.id',
        select: 'title price category picture',
      })
      .populate({
        path: 'userId',
        select: 'name email',
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Orders not found' });
    }

    const count = await Order.countDocuments();

    return res.status(200).json({
      success: true,
      data: orders,
      totalOrders: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Helper function to convert any date to Pakistan date string 'YYYY-MM-DD'
function toPakistanDateISOString(date) {
  const d = new Date(date);
  const pakistanOffset = 5 * 60; // 5 hours in minutes
  const localTime = new Date(d.getTime() + pakistanOffset * 60000);

  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// GET: Metrics (Sales, Users, Recent Orders)
router.get('/get-metrics', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    // Create cache key from query parameters
    const cacheKey = `metrics:${startDate || 'default'}:${endDate || 'default'}`;
    
    // Try to get from cache
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const start = new Date(startDate || new Date().setMonth(new Date().getMonth() - 1));
    const end = new Date(endDate || new Date());

    // Get orders in date range
    const ordersInRange = await Order.find({ createdAt: { $gte: start, $lte: end } });
    const totalSales = ordersInRange.reduce((acc, order) => acc + Number(order.amount), 0);

    // Calculate sales grouped by Pakistan date for frontend filtering
    const salesByDateMap = {};
    ordersInRange.forEach(order => {
      const date = toPakistanDateISOString(order.createdAt);
      if (!salesByDateMap[date]) {
        salesByDateMap[date] = 0;
      }
      salesByDateMap[date] += Number(order.amount);
    });
    const salesByDate = Object.entries(salesByDateMap).map(([date, totalAmount]) => ({
      date,
      totalAmount,
    }));

    // Calculate last month sales for growth
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 2));
    const lastMonthOrders = await Order.find({ createdAt: { $gte: lastMonth, $lte: start } });
    const totalLastMonth = lastMonthOrders.reduce((acc, order) => acc + Number(order.amount), 0);

    const salesGrowth = totalLastMonth
      ? ((totalSales - totalLastMonth) / totalLastMonth) * 100
      : 0;

    // Calculate users growth
    const thisMonthUsers = await User.find({ createdAt: { $gte: start, $lte: end } });
    const lastMonthUsers = await User.find({ createdAt: { $gte: lastMonth, $lte: start } });

    const usersGrowth = lastMonthUsers.length
      ? ((thisMonthUsers.length - lastMonthUsers.length) / lastMonthUsers.length) * 100
      : 0;

    // Active now: orders in last hour
    const lastHour = new Date(new Date().setHours(new Date().getHours() - 1));
    const lastHourOrders = await Order.find({ createdAt: { $gte: lastHour, $lte: new Date() } });

    // Previous day orders for growth calc
    const previousDayOrders = await Order.find({
      createdAt: {
        $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
        $lte: new Date(),
      },
    });

    const lastHourGrowth = previousDayOrders.length
      ? (lastHourOrders.length / previousDayOrders.length) * 100
      : 0;

    // Recent orders for display
    const recentOrders = await Order.find()
      .populate({ path: 'userId', select: 'name email' })
      .select('amount userId createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const response = {
      success: true,
      data: {
        totalSales: {
          count: totalSales.toFixed(2),
          growth: salesGrowth.toFixed(2),
        },
        users: {
          count: thisMonthUsers.length,
          growth: usersGrowth.toFixed(2),
        },
        sales: {
          count: totalSales.toFixed(2),
          growth: salesGrowth.toFixed(2),
        },
        activeNow: {
          count: lastHourOrders.length,
          growth: lastHourGrowth.toFixed(2),
        },
        recentSales: {
          count: totalSales.toFixed(2),
          orders: recentOrders,
        },
        salesByDate, // grouped by Pakistan date
      },
    };

    // Cache for 5 minutes (300 seconds) - metrics should be relatively fresh
    await CacheService.set(cacheKey, response, 300);

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route GET /api/orders/pending-orders-count
// @desc Get total count of pending orders (with caching and auto-refresh)
// @access Admin
router.get('/pending-orders-count', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    // Try to get from cache first
    let count = await PendingOrdersCounter.getCount();
    
    // If cache expired or doesn't exist, recalculate from database
    if (count === 0) {
      const dbCount = await Order.countDocuments({ status: 'pending' });
      await PendingOrdersCounter.setCount(dbCount);
      count = dbCount;
    } else {
      // Verify count is still accurate (optional check every 5 seconds)
      // The TTL will auto-refresh the count
      const dbCount = await Order.countDocuments({ status: 'pending' });
      // If there's a significant discrepancy, update cache
      if (Math.abs(count - dbCount) > 5) {
        await PendingOrdersCounter.setCount(dbCount);
        count = dbCount;
      }
    }
    
    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error getting pending orders count:', error);
    // Fallback to database if cache fails
    try {
      const count = await Order.countDocuments({ status: 'pending' });
      return res.status(200).json({ success: true, count });
    } catch (dbError) {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
});

// @route DELETE /api/orders/:id
// @desc Delete an order (Admin only)
// @access Admin
router.delete('/delete-order/:id', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate({
      path: 'products.id',
      select: 'title stock variations allowBackorder',
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await restoreInventoryForOrder(order, { reason: 'order_deleted', userId: req.user?._id });

    await Order.findByIdAndDelete(id);

    // Update pending orders counter if order was pending
    if (order.status === 'pending') {
      await PendingOrdersCounter.decrement();
    }

    // Invalidate admin stats cache
    await CacheService.invalidate('analytics:*');
    await CacheService.invalidate('metrics:*');

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully and stock restored',
    });
  } catch (error) {
    console.error('Delete Order Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route DELETE /api/orders/bulk-delete
// @desc Delete multiple orders (Admin only)
// @access Admin
router.delete('/bulk-delete-orders', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Order IDs array is required' });
    }

    const orders = await Order.find({ _id: { $in: orderIds } }).populate({
      path: 'products.id',
      select: 'title stock variations allowBackorder'
    });

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found' });
    }

    let pendingCount = 0;
    for (const order of orders) {
      await restoreInventoryForOrder(order, { reason: 'order_deleted', userId: req.user?._id });
      if (order.status === 'pending') {
        pendingCount++;
      }
    }

    const deleteResult = await Order.deleteMany({ _id: { $in: orderIds } });

    // Update pending orders counter
    if (pendingCount > 0) {
      for (let i = 0; i < pendingCount; i++) {
        await PendingOrdersCounter.decrement();
      }
    }

    // Invalidate admin stats cache
    await CacheService.invalidate('analytics:*');
    await CacheService.invalidate('metrics:*');

    return res.status(200).json({ 
      success: true, 
      message: `${deleteResult.deletedCount} orders deleted successfully and stock restored`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Bulk Delete Orders Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
