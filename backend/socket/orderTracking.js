const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const {
  updateOrderStatus,
  updateDriverLocation,
  serializeTrackingResponse,
} = require('../services/orderTrackingService');
const { canUserAccessOrder, canManageOrders } = require('../utils/orderAccess');

let io;

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...val] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(val.join('=') || '');
    return acc;
  }, {});

const authenticateSocket = (socket, next) => {
  try {
    const { auth = {}, headers = {} } = socket.handshake;
    const bearer = headers.authorization && headers.authorization.startsWith('Bearer ')
      ? headers.authorization.split(' ')[1]
      : null;
    const cookies = parseCookies(headers.cookie || '');
    const token = auth.token || bearer || cookies.accessToken;

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
};

const setOrderTrackingSocketServer = (socketServer) => {
  io = socketServer;
};

const registerOrderTrackingHandlers = (socket) => {
  socket.on('joinOrderRoom', async ({ orderId }) => {
    try {
      if (!orderId) return;
      const order = await Order.findById(orderId).select('userId');
      if (!order || !canUserAccessOrder(order, socket.user)) {
        return;
      }
      socket.join(`order:${orderId}`);
    } catch (error) {
      console.error('joinOrderRoom error:', error.message);
    }
  });

  socket.on('leaveOrderRoom', ({ orderId }) => {
    if (!orderId) return;
    socket.leave(`order:${orderId}`);
  });

  socket.on('updateDriverLocation', async (payload = {}, callback) => {
    try {
      if (!canManageOrders(socket.user)) {
        throw new Error('Forbidden');
      }
      const { orderId, lat, lng } = payload;
      const order = await updateDriverLocation({
        orderId,
        lat: Number(lat),
        lng: Number(lng),
      });
      const trackingPayload = serializeTrackingResponse(order);
      emitDriverLocationUpdate({
        orderId: trackingPayload.orderId,
        location: trackingPayload.location,
      });
      callback?.({ success: true, data: trackingPayload });
    } catch (error) {
      callback?.({ success: false, message: error.message });
    }
  });

  socket.on('updateOrderStatus', async (payload = {}, callback) => {
    try {
      if (!canManageOrders(socket.user)) {
        throw new Error('Forbidden');
      }
      const order = await updateOrderStatus({
        orderId: payload.orderId,
        status: payload.status,
        packerName: payload.packerName,
        paymentStatus: payload.paymentStatus,
        note: payload.note,
        user: socket.user,
      });
      const trackingPayload = serializeTrackingResponse(order);
      emitOrderStatusUpdate(trackingPayload);
      callback?.({ success: true, data: trackingPayload });
    } catch (error) {
      callback?.({ success: false, message: error.message });
    }
  });
};

const ensureIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

const emitOrderStatusUpdate = (trackingPayload) => {
  if (!trackingPayload) return;
  try {
    ensureIO()
      .to(`order:${trackingPayload.orderId}`)
      .emit('orderStatusUpdated', trackingPayload);
  } catch (error) {
    console.error('emitOrderStatusUpdate error:', error.message);
  }
};

const emitDriverLocationUpdate = ({ orderId, location }) => {
  if (!orderId || !location) return;
  try {
    ensureIO()
      .to(`order:${orderId}`)
      .emit('driverLocationUpdated', { orderId, location });
  } catch (error) {
    console.error('emitDriverLocationUpdate error:', error.message);
  }
};

module.exports = {
  setOrderTrackingSocketServer,
  registerOrderTrackingHandlers,
  authenticateSocket,
  emitOrderStatusUpdate,
  emitDriverLocationUpdate,
};

