const Order = require('../models/Order');
const { ORDER_STATUS_VALUES, ORDER_STATUS_FLOW } = require('../utils/orderStatus');
const { restoreInventoryForOrder } = require('./orderInventoryService');
const { canUserAccessOrder } = require('../utils/orderAccess');

const normalizeStatus = (status) => (status ? String(status).toLowerCase() : '');

const buildError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const populateOrderForTracking = async (orderId) => {
  return Order.findById(orderId)
    .populate({
      path: 'products.id',
      select: 'title price picture slug',
    })
    .populate('userId', 'name email')
    .lean();
};

const updateOrderStatus = async ({ orderId, status, user, packerName, paymentStatus, note }) => {
  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) {
    throw buildError(400, 'Status is required');
  }

  if (!ORDER_STATUS_VALUES.includes(normalizedStatus)) {
    throw buildError(400, `Invalid status. Must be one of: ${ORDER_STATUS_VALUES.join(', ')}`);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw buildError(404, 'Order not found');
  }

  const previousStatus = normalizeStatus(order.status);

  if (typeof packerName === 'string') {
    order.packerName = packerName.trim();
  }

  if (paymentStatus && ['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
    order.paymentStatus = paymentStatus;
  } else if (normalizedStatus === 'delivered') {
    order.paymentStatus = 'paid';
  }

  order.status = normalizedStatus;
  order._statusChangedBy = user?._id || user?.id;
  order._statusChangeNote = note;

  if (normalizedStatus === 'cancelled' && previousStatus !== 'cancelled') {
    await restoreInventoryForOrder(order, {
      reason: 'order_cancelled',
      userId: user?._id || user?.id,
    });
  }

  await order.save();

  return populateOrderForTracking(order._id);
};

const updateDriverLocation = async ({ orderId, lat, lng }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw buildError(400, 'Latitude and longitude are required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw buildError(404, 'Order not found');
  }

  order.location = {
    lat,
    lng,
    updatedAt: new Date(),
  };

  await order.save();

  return populateOrderForTracking(order._id);
};

const getTrackableOrderForUser = async ({ orderId, user }) => {
  const order = await Order.findById(orderId)
    .populate('userId', 'name email')
    .lean();

  if (!order || !canUserAccessOrder(order, user)) {
    throw buildError(404, 'Order not found');
  }

  return populateOrderForTracking(order._id);
};

const serializeTrackingResponse = (order) => {
  if (!order) return null;

  const location = order.location || {};
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

  return {
    orderId: order._id,
    status: normalizeStatus(order.status) || 'pending',
    location: {
      lat: location.lat ?? null,
      lng: location.lng ?? null,
      updatedAt: location.updatedAt || order.updatedAt,
    },
    history: history
      .map((entry) => ({
        status: normalizeStatus(entry.status),
        changedAt: entry.changedAt,
        note: entry.note,
      }))
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

module.exports = {
  updateOrderStatus,
  updateDriverLocation,
  getTrackableOrderForUser,
  serializeTrackingResponse,
  ORDER_STATUS_VALUES,
};

