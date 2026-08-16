const { query } = require('../../config/postgres');

const rowToOrder = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    amount: Number(row.amount),
    address: row.address,
    city: row.city,
    phone: row.phone,
    notes: row.notes || '',
    products: row.products || [],
    userId: row.user_id,
    guestInfo: row.is_guest_order
      ? { name: row.guest_name, email: row.guest_email, phone: row.guest_phone }
      : undefined,
    isGuestOrder: row.is_guest_order,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    payment: row.payment_id,
    coupon: row.coupon_id,
    couponCode: row.coupon_code,
    discountAmount: Number(row.discount_amount) || 0,
    shippingAddress: row.shipping_address_id,
    status: row.status,
    location: row.location,
    statusHistory: row.status_history || [],
    packerName: row.packer_name || '',
    shippingProvider: row.shipping_provider,
    trackingNumber: row.tracking_number,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const insertOrder = async (fields) => {
  const {
    amount, address, city, phone, notes, products, userId, isGuestOrder,
    guestName, guestEmail, guestPhone, paymentMethod, paymentStatus,
    couponId, couponCode, discountAmount, shippingAddressId, metadata,
  } = fields;

  const statusHistory = [{ status: 'pending', changedAt: new Date(), changedBy: userId || null, note: null }];

  const { rows } = await query(
    `insert into orders (
       amount, address, city, phone, notes, products, user_id, is_guest_order,
       guest_name, guest_email, guest_phone, payment_method, payment_status,
       coupon_id, coupon_code, discount_amount, shipping_address_id, status,
       status_history, metadata
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending',$18,$19
     ) returning *`,
    [
      amount, address, city, phone, notes || '', JSON.stringify(products || []),
      userId || null, Boolean(isGuestOrder), guestName || null, guestEmail || null,
      guestPhone || null, paymentMethod, paymentStatus, couponId || null,
      couponCode || null, discountAmount || 0, shippingAddressId || null,
      JSON.stringify(statusHistory), JSON.stringify(metadata || {}),
    ]
  );
  return rows[0];
};

const setPaymentId = async (orderId, paymentId) => {
  const { rows } = await query('update orders set payment_id = $2 where id = $1 returning *', [orderId, paymentId]);
  return rows[0];
};

const findByGuestEmail = async (email) => {
  const { rows } = await query('select * from orders where guest_email = $1 limit 1', [email]);
  return rows[0] || null;
};

const findByUserId = async (userId) => {
  const { rows } = await query('select 1 from orders where user_id = $1 limit 1', [userId]);
  return rows.length > 0;
};

const findById = async (id) => {
  const { rows } = await query('select * from orders where id = $1', [id]);
  return rows[0] || null;
};

const listOrdersByUser = async (userId) => {
  const { rows } = await query('select * from orders where user_id = $1 order by created_at desc', [userId]);
  return rows.map(rowToOrder);
};

const listAllOrders = async ({ page = 1, limit = 10 }) => {
  const { rows } = await query(
    'select * from orders order by created_at desc limit $1 offset $2',
    [limit, (page - 1) * limit]
  );
  const countResult = await query('select count(*) from orders');
  return { orders: rows.map(rowToOrder), total: Number(countResult.rows[0].count) };
};

const updateStatusFields = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let idx = 1;

  const columnMap = {
    status: 'status',
    packerName: 'packer_name',
    paymentStatus: 'payment_status',
    statusHistory: 'status_history',
    location: 'location',
    trackingNumber: 'tracking_number',
    shippingProvider: 'shipping_provider',
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined) return;
    const column = columnMap[key];
    if (!column) return;
    setClauses.push(`${column} = $${idx}`);
    params.push(key === 'statusHistory' || key === 'location' ? JSON.stringify(value) : value);
    idx += 1;
  });

  if (setClauses.length === 0) return findById(id);

  params.push(id);
  const { rows } = await query(`update orders set ${setClauses.join(', ')} where id = $${idx} returning *`, params);
  return rows[0];
};

const deleteById = async (id) => {
  await query('delete from orders where id = $1', [id]);
};

const deleteByIds = async (ids) => {
  const { rowCount } = await query('delete from orders where id = any($1::uuid[])', [ids]);
  return rowCount;
};

const countPending = async () => {
  const { rows } = await query("select count(*) from orders where status = 'pending'");
  return Number(rows[0].count);
};

const findOrdersInRange = async (start, end) => {
  const { rows } = await query('select * from orders where created_at >= $1 and created_at <= $2', [start, end]);
  return rows.map(rowToOrder);
};

const listRecentOrders = async (limit) => {
  const { rows } = await query('select * from orders order by created_at desc limit $1', [limit]);
  return rows.map(rowToOrder);
};

module.exports = {
  rowToOrder,
  insertOrder,
  setPaymentId,
  findByGuestEmail,
  findByUserId,
  findById,
  listOrdersByUser,
  listAllOrders,
  updateStatusFields,
  deleteById,
  deleteByIds,
  countPending,
  findOrdersInRange,
  listRecentOrders,
};
