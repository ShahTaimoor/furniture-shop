const orderModel = require('../models/postgres/orderModel');
const userModel = require('../models/postgres/userModel');
const { ORDER_STATUS_VALUES, ORDER_STATUS_FLOW } = require('../utils/orderStatus');
const { restoreInventoryForOrder } = require('./pgOrderInventoryService');
const { canUserAccessOrder } = require('../utils/orderAccess');

const normalizeStatus = (status) => (status ? String(status).toLowerCase() : '');

const buildError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const populateOrderForTracking = async (orderId) => {
  const row = await orderModel.findById(orderId);
  if (!row) return null;
  const order = orderModel.rowToOrder(row);

  if (order.userId) {
    const userRow = await userModel.findById(order.userId).catch(() => null);
    if (userRow) order.userId = { _id: userRow.id, name: userRow.name, email: userRow.email };
  }

  return order;
};

const updateOrderStatus = async ({ orderId, status, user, packerName, paymentStatus, note }) => {
  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) {
    throw buildError(400, 'Status is required');
  }
  if (!ORDER_STATUS_VALUES.includes(normalizedStatus)) {
    throw buildError(400, `Invalid status. Must be one of: ${ORDER_STATUS_VALUES.join(', ')}`);
  }

  const orderRow = await orderModel.findById(orderId);
  if (!orderRow) {
    throw buildError(404, 'Order not found');
  }
  const order = orderModel.rowToOrder(orderRow);
  const previousStatus = normalizeStatus(order.status);

  const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
  const lastEntry = history[history.length - 1];
  if (!lastEntry || lastEntry.status !== normalizedStatus) {
    history.push({ status: normalizedStatus, changedAt: new Date(), changedBy: user?._id || user?.id, note: note || null });
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

  await orderModel.updateStatusFields(orderId, updates);
  return populateOrderForTracking(orderId);
};

const updateDriverLocation = async ({ orderId, lat, lng }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw buildError(400, 'Latitude and longitude are required');
  }

  const orderRow = await orderModel.findById(orderId);
  if (!orderRow) {
    throw buildError(404, 'Order not found');
  }

  await orderModel.updateStatusFields(orderId, { location: { lat, lng, updatedAt: new Date() } });
  return populateOrderForTracking(orderId);
};

const getTrackableOrderForUser = async ({ orderId, user }) => {
  const orderRow = await orderModel.findById(orderId);
  if (!orderRow) {
    throw buildError(404, 'Order not found');
  }
  const order = orderModel.rowToOrder(orderRow);
  if (!canUserAccessOrder(order, user)) {
    throw buildError(404, 'Order not found');
  }

  return populateOrderForTracking(orderId);
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

module.exports = {
  updateOrderStatus,
  updateDriverLocation,
  getTrackableOrderForUser,
  serializeTrackingResponse,
  ORDER_STATUS_VALUES,
};
