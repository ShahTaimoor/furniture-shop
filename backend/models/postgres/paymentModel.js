const { query } = require('../../config/postgres');

const rowToPayment = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    order: row.order_id,
    user: row.user_id,
    paymentMethod: row.payment_method,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    transactionId: row.transaction_id,
    gatewayReference: row.gateway_reference,
    gatewayName: row.gateway_name,
    metadata: row.metadata || {},
    gatewayResponse: row.gateway_response || {},
    refund:
      row.refund_amount !== null
        ? {
            amount: Number(row.refund_amount),
            reason: row.refund_reason,
            refundedAt: row.refunded_at,
            refundedBy: row.refunded_by,
            gatewayRefundId: row.gateway_refund_id,
          }
        : undefined,
    cardDetails: row.card_last4 ? { last4: row.card_last4, brand: row.card_brand } : undefined,
    walletDetails: row.wallet_provider
      ? { provider: row.wallet_provider, accountNumber: row.wallet_account_number, transactionReference: row.wallet_transaction_reference }
      : undefined,
    description: row.description,
    initiatedAt: row.initiated_at,
    completedAt: row.completed_at,
    failureReason: row.failure_reason,
    attemptNumber: row.attempt_number,
    isSuccessful: row.status === 'completed',
    isPending: row.status === 'pending' || row.status === 'processing',
    canBeRefunded: row.status === 'completed' && row.refund_amount === null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const create = async (fields) => {
  const { orderId, userId, paymentMethod, amount, currency, status, gatewayName, description, metadata, gatewayReference } = fields;
  const { rows } = await query(
    `insert into payments (order_id, user_id, payment_method, amount, currency, status, gateway_name, description, metadata, gateway_reference)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning *`,
    [
      orderId, userId, paymentMethod.toUpperCase(), amount, (currency || 'PKR').toUpperCase(),
      status || 'pending', gatewayName || null, description || null, JSON.stringify(metadata || {}),
      gatewayReference || null,
    ]
  );
  return rowToPayment(rows[0]);
};

const findById = async (id) => {
  const { rows } = await query('select * from payments where id = $1', [id]);
  return rowToPayment(rows[0]);
};

const findByGatewayReference = async (gatewayReference) => {
  const { rows } = await query('select * from payments where gateway_reference = $1', [gatewayReference]);
  return rowToPayment(rows[0]);
};

const listByUser = async ({ userId, status, paymentMethod, page = 1, limit = 20 }) => {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx += 1; }
  if (paymentMethod) { conditions.push(`payment_method = $${idx}`); params.push(paymentMethod.toUpperCase()); idx += 1; }

  const whereClause = conditions.join(' and ');
  const countResult = await query(`select count(*) from payments where ${whereClause}`, params);
  const total = Number(countResult.rows[0].count);

  const listParams = [...params, limit, (page - 1) * limit];
  const { rows } = await query(
    `select * from payments where ${whereClause} order by created_at desc limit $${idx} offset $${idx + 1}`,
    listParams
  );
  return { payments: rows.map(rowToPayment), total };
};

const listAll = async ({ status, paymentMethod, startDate, endDate, page = 1, limit = 50 }) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx += 1; }
  if (paymentMethod) { conditions.push(`payment_method = $${idx}`); params.push(paymentMethod.toUpperCase()); idx += 1; }
  if (startDate) { conditions.push(`created_at >= $${idx}`); params.push(new Date(startDate)); idx += 1; }
  if (endDate) { conditions.push(`created_at <= $${idx}`); params.push(new Date(endDate)); idx += 1; }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
  const countResult = await query(`select count(*) from payments ${whereClause}`, params);
  const total = Number(countResult.rows[0].count);

  const listParams = [...params, limit, (page - 1) * limit];
  const { rows } = await query(
    `select * from payments ${whereClause} order by created_at desc limit $${idx} offset $${idx + 1}`,
    listParams
  );

  const statsResult = await query(
    `select status, count(*) as count, sum(amount) as total_amount from payments ${whereClause} group by status`,
    params
  );
  const stats = statsResult.rows.map((r) => ({ _id: r.status, count: Number(r.count), totalAmount: Number(r.total_amount) }));

  return { payments: rows.map(rowToPayment), total, stats };
};

const markCompleted = async (id, gatewayData = {}) => {
  const setClauses = ["status = 'completed'", 'completed_at = now()'];
  const params = [];
  let idx = 1;

  if (gatewayData.transactionId) { setClauses.push(`transaction_id = $${idx}`); params.push(gatewayData.transactionId); idx += 1; }
  if (gatewayData.gatewayReference) { setClauses.push(`gateway_reference = $${idx}`); params.push(gatewayData.gatewayReference); idx += 1; }
  if (gatewayData.metadata) {
    const existing = await findById(id);
    setClauses.push(`gateway_response = $${idx}`);
    params.push(JSON.stringify({ ...(existing?.gatewayResponse || {}), ...gatewayData.metadata }));
    idx += 1;
  }

  params.push(id);
  const { rows } = await query(`update payments set ${setClauses.join(', ')} where id = $${idx} returning *`, params);
  return rowToPayment(rows[0]);
};

const markFailed = async (id, reason = '') => {
  const { rows } = await query("update payments set status = 'failed', failure_reason = $2 where id = $1 returning *", [id, reason]);
  return rowToPayment(rows[0]);
};

const processRefund = async (id, refundData) => {
  const { rows } = await query(
    `update payments set status = 'refunded', refund_amount = $2, refund_reason = $3, refunded_at = now(),
       refunded_by = $4, gateway_refund_id = $5
     where id = $1 returning *`,
    [id, refundData.amount, refundData.reason || '', refundData.refundedBy || null, refundData.gatewayRefundId || null]
  );
  return rowToPayment(rows[0]);
};

module.exports = {
  rowToPayment,
  create,
  findById,
  findByGatewayReference,
  listByUser,
  listAll,
  markCompleted,
  markFailed,
  processRefund,
};
