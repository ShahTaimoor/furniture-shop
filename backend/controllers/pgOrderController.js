const orderModel = require('../models/postgres/orderModel');
const productModel = require('../models/postgres/productModel');
const couponModel = require('../models/postgres/couponModel');
const paymentModel = require('../models/postgres/paymentModel');
const userModel = require('../models/postgres/userModel');
const { query: pgQuery } = require('../config/postgres');
const { rowToAddress } = require('./pgAddressController');
const notificationModel = require('../models/postgres/notificationModel');
const { PendingOrdersCounter, CacheService } = require('../services/redisService');
const { restoreInventoryForOrder } = require('../services/pgOrderInventoryService');
const { emitOrderStatusUpdate, emitDriverLocationUpdate } = require('../socket/orderTracking');
const { canUserAccessOrder } = require('../utils/orderAccess');
const { ORDER_STATUS_VALUES, ORDER_STATUS_FLOW } = require('../utils/orderStatus');

const normalizeStatus = (status) => (status ? String(status).toLowerCase() : '');

// Attach lightweight product/user display info to an order for list/detail responses
// (mirrors what Mongo's .populate() used to provide).
const enrichOrder = async (order) => {
  const productIds = Array.from(new Set((order.products || []).map((p) => p.id).filter(Boolean)));
  const productMap = new Map();
  if (productIds.length > 0) {
    const rows = await Promise.all(productIds.map((id) => productModel.findRawById(id)));
    rows.forEach((row) => {
      if (row) productMap.set(row.id, productModel.rowToProduct(row));
    });
  }

  const products = (order.products || []).map((item) => {
    const product = productMap.get(item.id);
    return {
      ...item,
      id: product ? { _id: product._id, title: product.title, price: product.price, picture: product.picture } : item.id,
    };
  });

  let userId = order.userId;
  if (order.userId) {
    const userRow = await userModel.findById(order.userId).catch(() => null);
    if (userRow) userId = { _id: userRow.id, name: userRow.name, email: userRow.email };
  }

  return { ...order, products, userId };
};

const serializeTrackingResponse = (order) => {
  if (!order) return null;
  const location = order.location || {};
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

  return {
    orderId: order._id,
    status: normalizeStatus(order.status) || 'pending',
    location: { lat: location.lat ?? null, lng: location.lng ?? null, updatedAt: location.updatedAt || order.updatedAt },
    history: history
      .map((entry) => ({ status: normalizeStatus(entry.status), changedAt: entry.changedAt, note: entry.note }))
      .sort((a, b) => new Date(a.changedAt || 0) - new Date(b.changedAt || 0)),
    customer: {
      name: order.userId?.name || order.guestInfo?.name || 'Customer',
      email: order.userId?.email || order.guestInfo?.email || null,
    },
    amount: order.amount,
    trackingNumber: order.trackingNumber,
    lastUpdated: order.updatedAt,
    timelineStatuses: ORDER_STATUS_FLOW,
  };
};

// @route POST /api/pg/order/guest
// @desc Place a guest order (without authentication)
const createGuestOrder = async (req, res) => {
  try {
    const {
      products, address, amount, phone, city, name, email, notes,
      paymentMethod = 'COD', paymentStatus, metadata = {}, couponCode,
      deliveryOption = 'standard',
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!phone || !phone.trim()) return res.status(400).json({ success: false, message: 'Phone is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No products provided' });
    }
    if (!address || !address.trim()) return res.status(400).json({ success: false, message: 'Shipping address is required' });
    if (!city || !city.trim()) return res.status(400).json({ success: false, message: 'City is required' });

    const orderProducts = [];
    let calculatedAmount = 0;

    for (const item of products) {
      if (!item?.id || !item?.quantity) {
        return res.status(400).json({ success: false, message: 'Invalid product item in order' });
      }

      const productRow = await productModel.findRawById(item.id);
      if (!productRow || productRow.is_deleted || productRow.status !== 'active') {
        return res.status(404).json({ success: false, message: `Product not found: ${item.id}` });
      }
      const product = productModel.rowToProduct(productRow);

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
      calculatedAmount += linePrice * quantity;

      const { error } = await productModel.deductStockForOrderItem(item.id, quantity);
      if (error) return res.status(400).json({ success: false, message: error });

      orderProducts.push({
        id: product._id,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        image: { secure_url: product.picture?.secure_url || product.image || null, public_id: product.picture?.public_id || null },
      });
    }

    let totalAmount = Number.isFinite(Number(amount)) ? Number(amount) : calculatedAmount;
    let discountAmount = 0;
    let coupon = null;

    if (couponCode) {
      try {
        coupon = await couponModel.findByCode(couponCode);
        if (coupon && coupon.isValid) {
          if (coupon.firstTimeUsersOnly) {
            const existingOrder = await orderModel.findByGuestEmail(email.toLowerCase().trim());
            if (existingOrder) {
              return res.status(400).json({ success: false, message: 'This coupon is only valid for first-time customers' });
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

    const shippingCost = deliveryOption === 'express' ? 500 : 0;
    totalAmount += shippingCost;

    const row = await orderModel.insertOrder({
      amount: Number(totalAmount.toFixed(2)),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      notes: notes || '',
      products: orderProducts,
      isGuestOrder: true,
      guestName: name.trim(),
      guestEmail: email.toLowerCase().trim(),
      guestPhone: phone.trim(),
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus: paymentStatus || 'pending',
      couponId: coupon?._id?.toString(),
      couponCode: coupon?.code,
      discountAmount: Number(discountAmount.toFixed(2)),
      metadata: { ...metadata, deliveryOption, shippingCost },
    });
    const order = orderModel.rowToOrder(row);

    if (order.status === 'pending') {
      await PendingOrdersCounter.increment();
    }

    try {
      // Notifications require a user_id, so alert admins/super admins about the new guest order.
      const { rows: admins } = await pgQuery(`select id from users where role in (1, 2)`);
      await Promise.all(
        admins.map((admin) =>
          notificationModel.create({
            user: admin.id,
            type: 'system',
            title: 'New Guest Order',
            message: `New guest order #${order._id} placed by ${name}`,
            priority: 'high',
            relatedEntity: { type: 'order', id: order._id },
          })
        )
      );
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

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
    console.error('pg guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while placing order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @route POST /api/pg/order
// @desc Place a new order (for authenticated users)
const createOrder = async (req, res) => {
  try {
    const {
      products, address, amount, phone, city, notes,
      paymentMethod = 'COD', paymentStatus, metadata = {}, couponCode, shippingAddressId,
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

      const productRow = await productModel.findRawById(item.id);
      if (!productRow || productRow.is_deleted) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.id}` });
      }
      const product = productModel.rowToProduct(productRow);

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for product: ${product.title}` });
      }

      let variation = null;
      if (item.variationId) {
        variation = (product.variations || []).find((v) => v.id === item.variationId);
      }
      if (!variation && item.variationSku) {
        variation = (product.variations || []).find((v) => v.sku === item.variationSku);
      }

      const { error, variation: deductedVariation } = await productModel.deductStockForOrderItem(item.id, quantity, {
        variationId: variation?.id,
        variationSku: variation?.sku,
      });
      if (error) return res.status(400).json({ success: false, message: error });

      const basePrice = variation?.price ?? variation?.salePrice ?? product.salePrice ?? product.price;
      const linePrice = Number(basePrice) || 0;
      calculatedAmount += linePrice * quantity;

      orderProducts.push({
        id: product._id,
        title: product.title,
        slug: product.slug,
        sku: variation?.sku || product.sku,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        variation: deductedVariation
          ? {
              variationId: deductedVariation.id,
              name: deductedVariation.name,
              sku: deductedVariation.sku,
              price: deductedVariation.price,
              attributes: deductedVariation.attributes,
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

    if (couponCode) {
      try {
        coupon = await couponModel.findByCode(couponCode);
        if (coupon && coupon.isValid) {
          const isFirstTimeUser = !(await orderModel.findByUserId(req.user.id));
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
      }
    }

    const userRow = await userModel.findById(req.user.id);
    if (!userRow) return res.status(404).json({ success: false, message: 'User not found' });
    const user = userModel.rowToUser(userRow);

    let shippingAddress = null;
    if (shippingAddressId) {
      const { rows } = await pgQuery(
        'select * from addresses where id = $1 and user_id = $2 and is_active = true',
        [shippingAddressId, req.user.id]
      );
      shippingAddress = rowToAddress(rows[0]);
    }

    const finalAddress = shippingAddress ? shippingAddress.getFullAddress() : (address || user.address || '');
    const finalPhone = shippingAddress?.phone || phone || user.phone || '';
    const finalCity = shippingAddress?.city || city || user.city || '';

    if (!finalAddress || !finalAddress.trim()) {
      return res.status(400).json({ success: false, message: 'Shipping address is required. Please update your profile or provide a shipping address.' });
    }
    if (!finalCity || !finalCity.trim()) {
      return res.status(400).json({ success: false, message: 'City is required. Please update your profile or provide a city.' });
    }
    if (!finalPhone || !finalPhone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required. Please update your profile or provide a phone number.' });
    }

    const profileUpdates = {};
    if (!user.address && address) profileUpdates.address = address;
    if (!user.phone && phone) profileUpdates.phone = phone;
    if (!user.city && city) profileUpdates.city = city;
    if (Object.keys(profileUpdates).length > 0) await userModel.updateById(req.user.id, profileUpdates);

    const computedPaymentStatus =
      paymentStatus || (paymentMethod === 'CARD' ? 'paid' : paymentMethod === 'BANK_TRANSFER' ? 'pending' : 'pending');
    const orderMetadata = metadata && typeof metadata === 'object' ? metadata : {};

    const row = await orderModel.insertOrder({
      amount: totalAmount,
      address: finalAddress,
      city: finalCity,
      phone: String(finalPhone),
      notes,
      products: orderProducts,
      userId: req.user.id,
      isGuestOrder: false,
      paymentMethod,
      paymentStatus: computedPaymentStatus,
      couponId: coupon?._id?.toString(),
      couponCode: coupon?.code,
      discountAmount,
      shippingAddressId: shippingAddress?._id?.toString(),
      metadata: orderMetadata,
    });
    let order = orderModel.rowToOrder(row);

    if (order.status === 'pending') {
      await PendingOrdersCounter.increment();
    }

    if (coupon && discountAmount > 0) {
      await couponModel.recordUsage(coupon._id, req.user.id, order._id);
    }

    if (paymentMethod !== 'COD' && paymentMethod !== 'cod') {
      const payment = await paymentModel.create({
        orderId: order._id,
        userId: req.user.id,
        paymentMethod,
        amount: totalAmount,
        status: computedPaymentStatus === 'paid' ? 'completed' : 'pending',
        gatewayName: paymentMethod.toLowerCase(),
        description: `Payment for order #${order._id}`,
      });
      const updatedRow = await orderModel.setPaymentId(order._id, payment._id);
      order = orderModel.rowToOrder(updatedRow);
    }

    try {
      await notificationModel.create({
        user: req.user.id,
        type: 'order_confirmation',
        title: 'Order Confirmed',
        message: `Your order #${order._id} has been confirmed. Total amount: PKR ${totalAmount}`,
        priority: 'high',
        relatedEntity: { type: 'order', id: order._id },
        action: { label: 'View Order', url: `/orders/${order._id}` },
      });
    } catch (notifError) {
      console.error('Notification creation error:', notifError);
    }

    return res.status(201).json({ success: true, data: { ...order, userId: { _id: user._id, name: user.name, email: user.email } } });
  } catch (error) {
    console.error('pg order error:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @route GET /api/pg/get-orders-by-user-id
const getOrdersByUserId = async (req, res) => {
  try {
    const orders = await orderModel.listOrdersByUser(req.user.id);
    const enriched = await Promise.all(orders.map(enrichOrder));
    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('pg getOrdersByUserId error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route GET /api/pg/get-all-orders
const getAllOrders = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  try {
    const { orders, total } = await orderModel.listAllOrders({ page, limit });
    const enriched = await Promise.all(orders.map(enrichOrder));

    return res.status(200).json({
      success: true,
      data: enriched,
      totalOrders: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('pg getAllOrders error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route PATCH /api/pg/orders/:id/status
// @route PUT /api/pg/update-order-status/:id
const updateOrderStatusHandler = async (req, res) => {
  try {
    const { status, packerName, paymentStatus, note } = req.body || {};
    const { id } = req.params;

    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    if (!ORDER_STATUS_VALUES.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${ORDER_STATUS_VALUES.join(', ')}` });
    }

    const orderRow = await orderModel.findById(id);
    if (!orderRow) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderModel.rowToOrder(orderRow);
    const previousStatus = normalizeStatus(order.status);

    const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.status !== normalizedStatus) {
      history.push({
        status: normalizedStatus,
        changedAt: new Date(),
        changedBy: req.user?._id || req.user?.id,
        note: note || null,
      });
    }

    const updates = { status: normalizedStatus, statusHistory: history };
    if (typeof packerName === 'string') updates.packerName = packerName.trim();
    if (paymentStatus && ['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      updates.paymentStatus = paymentStatus;
    } else if (normalizedStatus === 'delivered') {
      updates.paymentStatus = 'paid';
    }

    if (normalizedStatus === 'cancelled' && previousStatus !== 'cancelled') {
      await restoreInventoryForOrder(order);
    }

    const updatedRow = await orderModel.updateStatusFields(id, updates);
    const updatedOrder = await enrichOrder(orderModel.rowToOrder(updatedRow));

    if (previousStatus === 'pending' && normalizedStatus !== 'pending') {
      await PendingOrdersCounter.decrement();
    } else if (previousStatus !== 'pending' && normalizedStatus === 'pending') {
      await PendingOrdersCounter.increment();
    }

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
    console.error('pg updateOrderStatus error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @route PATCH /api/pg/orders/:id/location
const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    const { id } = req.params;

    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const orderRow = await orderModel.findById(id);
    if (!orderRow) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const location = { lat: numLat, lng: numLng, updatedAt: new Date() };
    const updatedRow = await orderModel.updateStatusFields(id, { location });
    const updatedOrder = await enrichOrder(orderModel.rowToOrder(updatedRow));

    const trackingPayload = serializeTrackingResponse(updatedOrder);
    emitDriverLocationUpdate({ orderId: trackingPayload.orderId, location: trackingPayload.location });

    return res.status(200).json({
      success: true,
      message: 'Driver location updated successfully',
      data: updatedOrder,
      tracking: trackingPayload,
    });
  } catch (error) {
    console.error('pg updateLocation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @route GET /api/pg/orders/:id/track
const trackOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderRow = await orderModel.findById(id);
    if (!orderRow) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderModel.rowToOrder(orderRow);
    if (!canUserAccessOrder(order, req.user)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const enriched = await enrichOrder(order);
    return res.status(200).json({ success: true, data: serializeTrackingResponse(enriched) });
  } catch (error) {
    console.error('pg trackOrder error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @route GET /api/pg/pending-orders-count
const getPendingOrdersCount = async (req, res) => {
  try {
    let count = await PendingOrdersCounter.getCount();
    const dbCount = await orderModel.countPending();

    if (count === 0) {
      await PendingOrdersCounter.setCount(dbCount);
      count = dbCount;
    } else if (Math.abs(count - dbCount) > 5) {
      await PendingOrdersCounter.setCount(dbCount);
      count = dbCount;
    }

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('pg getPendingOrdersCount error:', error);
    try {
      const count = await orderModel.countPending();
      return res.status(200).json({ success: true, count });
    } catch {
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

const toPakistanDateISOString = (date) => {
  const d = new Date(date);
  const pakistanOffset = 5 * 60;
  const localTime = new Date(d.getTime() + pakistanOffset * 60000);
  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @route GET /api/pg/get-metrics
const getMetrics = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const cacheKey = `metrics:pg:${startDate || 'default'}:${endDate || 'default'}`;
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const start = new Date(startDate || new Date().setMonth(new Date().getMonth() - 1));
    const end = new Date(endDate || new Date());

    const ordersInRange = await orderModel.findOrdersInRange(start, end);
    const totalSales = ordersInRange.reduce((acc, order) => acc + Number(order.amount), 0);

    const salesByDateMap = {};
    ordersInRange.forEach((order) => {
      const date = toPakistanDateISOString(order.createdAt);
      salesByDateMap[date] = (salesByDateMap[date] || 0) + Number(order.amount);
    });
    const salesByDate = Object.entries(salesByDateMap).map(([date, totalAmount]) => ({ date, totalAmount }));

    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 2));
    const lastMonthOrders = await orderModel.findOrdersInRange(lastMonth, start);
    const totalLastMonth = lastMonthOrders.reduce((acc, order) => acc + Number(order.amount), 0);
    const salesGrowth = totalLastMonth ? ((totalSales - totalLastMonth) / totalLastMonth) * 100 : 0;

    const { rows: thisMonthUserRows } = await pgQuery('select count(*) from users where created_at >= $1 and created_at <= $2', [start, end]);
    const { rows: lastMonthUserRows } = await pgQuery('select count(*) from users where created_at >= $1 and created_at <= $2', [lastMonth, start]);
    const thisMonthUserCount = Number(thisMonthUserRows[0].count);
    const lastMonthUserCount = Number(lastMonthUserRows[0].count);
    const usersGrowth = lastMonthUserCount
      ? ((thisMonthUserCount - lastMonthUserCount) / lastMonthUserCount) * 100
      : 0;

    const lastHour = new Date(new Date().setHours(new Date().getHours() - 1));
    const lastHourOrders = await orderModel.findOrdersInRange(lastHour, new Date());
    const previousDayOrders = await orderModel.findOrdersInRange(
      new Date(new Date().setDate(new Date().getDate() - 1)),
      new Date()
    );
    const lastHourGrowth = previousDayOrders.length ? (lastHourOrders.length / previousDayOrders.length) * 100 : 0;

    const recentOrdersRaw = await orderModel.listRecentOrders(10);
    const recentOrders = await Promise.all(recentOrdersRaw.map(enrichOrder));

    const response = {
      success: true,
      data: {
        totalSales: { count: totalSales.toFixed(2), growth: salesGrowth.toFixed(2) },
        users: { count: thisMonthUserCount, growth: usersGrowth.toFixed(2) },
        sales: { count: totalSales.toFixed(2), growth: salesGrowth.toFixed(2) },
        activeNow: { count: lastHourOrders.length, growth: lastHourGrowth.toFixed(2) },
        recentSales: { count: totalSales.toFixed(2), orders: recentOrders },
        salesByDate,
      },
    };

    await CacheService.set(cacheKey, response, 300);
    return res.status(200).json(response);
  } catch (error) {
    console.error('pg getMetrics error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/pg/delete-order/:id
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderRow = await orderModel.findById(id);
    if (!orderRow) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderModel.rowToOrder(orderRow);

    await restoreInventoryForOrder(order);
    await orderModel.deleteById(id);

    if (order.status === 'pending') {
      await PendingOrdersCounter.decrement();
    }

    await CacheService.invalidate('analytics:*');
    await CacheService.invalidate('metrics:*');

    return res.status(200).json({ success: true, message: 'Order deleted successfully and stock restored' });
  } catch (error) {
    console.error('pg deleteOrder error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route DELETE /api/pg/bulk-delete-orders
const bulkDeleteOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Order IDs array is required' });
    }

    const rows = await Promise.all(orderIds.map((id) => orderModel.findById(id)));
    const orders = rows.filter(Boolean).map(orderModel.rowToOrder);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found' });
    }

    let pendingCount = 0;
    for (const order of orders) {
      // eslint-disable-next-line no-await-in-loop
      await restoreInventoryForOrder(order);
      if (order.status === 'pending') pendingCount += 1;
    }

    const deletedCount = await orderModel.deleteByIds(orders.map((o) => o._id));

    for (let i = 0; i < pendingCount; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await PendingOrdersCounter.decrement();
    }

    await CacheService.invalidate('analytics:*');
    await CacheService.invalidate('metrics:*');

    return res.status(200).json({
      success: true,
      message: `${deletedCount} orders deleted successfully and stock restored`,
      deletedCount,
    });
  } catch (error) {
    console.error('pg bulkDeleteOrders error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  createGuestOrder,
  createOrder,
  getOrdersByUserId,
  getAllOrders,
  updateOrderStatusHandler,
  updateLocation,
  trackOrder,
  getPendingOrdersCount,
  getMetrics,
  deleteOrder,
  bulkDeleteOrders,
};
