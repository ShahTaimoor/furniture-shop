const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  return value.toString();
};

const canManageOrders = (user = {}) => {
  if (!user) return false;
  const role = typeof user.role === 'number' ? user.role : Number(user.role);
  return role === 1 || role === 2;
};

const canUserAccessOrder = (order, user) => {
  if (!order || !user) return false;
  if (canManageOrders(user)) return true;
  if (!order.userId) return false;
  const orderOwnerId = normalizeId(order.userId);
  const userId = normalizeId(user._id || user.id);
  return Boolean(orderOwnerId && userId && orderOwnerId === userId);
};

module.exports = {
  normalizeId,
  canManageOrders,
  canUserAccessOrder,
};

