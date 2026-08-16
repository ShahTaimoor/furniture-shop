const { query } = require('../../config/postgres');

const rowToCoupon = (row) => {
  if (!row) return null;
  const now = new Date();
  const isValid =
    row.status === 'active' &&
    new Date(row.valid_from) <= now &&
    new Date(row.valid_until) >= now &&
    (row.usage_limit === null || row.usage_count < row.usage_limit);

  return {
    _id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minimumOrderAmount: Number(row.minimum_order_amount) || 0,
    maximumDiscountAmount: row.maximum_discount_amount !== null ? Number(row.maximum_discount_amount) : undefined,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    perUserLimit: row.per_user_limit,
    applicableCategories: row.applicable_categories || [],
    applicableProducts: row.applicable_products || [],
    excludedCategories: row.excluded_categories || [],
    excludedProducts: row.excluded_products || [],
    firstTimeUsersOnly: row.first_time_users_only,
    status: row.status,
    createdBy: row.created_by,
    usedBy: row.used_by || [],
    isValid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canBeUsedBy(userId, isFirstTimeUser = false) {
      if (!this.isValid) return { valid: false, reason: 'Coupon is not valid' };
      if (this.firstTimeUsersOnly && !isFirstTimeUser) {
        return { valid: false, reason: 'This coupon is only for first-time users' };
      }
      const userUsageCount = this.usedBy.filter((usage) => usage.user === String(userId)).length;
      if (userUsageCount >= this.perUserLimit) {
        return { valid: false, reason: 'You have reached the maximum usage limit for this coupon' };
      }
      return { valid: true };
    },
    calculateDiscount(orderAmount) {
      if (orderAmount < this.minimumOrderAmount) {
        return { valid: false, reason: `Minimum order amount of ${this.minimumOrderAmount} is required` };
      }
      let discountAmount = 0;
      if (this.discountType === 'percentage') {
        discountAmount = (orderAmount * this.discountValue) / 100;
        if (this.maximumDiscountAmount && discountAmount > this.maximumDiscountAmount) {
          discountAmount = this.maximumDiscountAmount;
        }
      } else {
        discountAmount = this.discountValue;
        if (discountAmount > orderAmount) discountAmount = orderAmount;
      }
      const rounded = Math.round(discountAmount * 100) / 100;
      return { valid: true, discountAmount: rounded, finalAmount: orderAmount - rounded };
    },
  };
};

const findByCode = async (code) => {
  const { rows } = await query('select * from coupons where code = $1 and status = $2', [
    code.toUpperCase().trim(),
    'active',
  ]);
  return rowToCoupon(rows[0]);
};

const findById = async (id) => {
  const { rows } = await query('select * from coupons where id = $1', [id]);
  return rowToCoupon(rows[0]);
};

const recordUsage = async (couponId, userId, orderId) => {
  const { rows } = await query('select used_by from coupons where id = $1', [couponId]);
  const usedBy = rows[0]?.used_by || [];
  usedBy.push({ user: String(userId), usedAt: new Date(), orderId: String(orderId) });

  const { rows: updated } = await query(
    'update coupons set usage_count = usage_count + 1, used_by = $2 where id = $1 returning *',
    [couponId, JSON.stringify(usedBy)]
  );
  return rowToCoupon(updated[0]);
};

const list = async ({ status, page = 1, limit = 20 }) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx}`);
    params.push(status);
    idx += 1;
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
  const countResult = await query(`select count(*) from coupons ${whereClause}`, params);
  const total = Number(countResult.rows[0].count);

  const listParams = [...params, limit, (page - 1) * limit];
  const { rows } = await query(
    `select * from coupons ${whereClause} order by created_at desc limit $${idx} offset $${idx + 1}`,
    listParams
  );

  return { coupons: rows.map(rowToCoupon), total };
};

const create = async (fields) => {
  const {
    code, name, description, discountType, discountValue, minimumOrderAmount,
    maximumDiscountAmount, validFrom, validUntil, usageLimit, perUserLimit,
    applicableCategories, applicableProducts, excludedCategories, excludedProducts,
    firstTimeUsersOnly, status, createdBy,
  } = fields;

  const { rows } = await query(
    `insert into coupons (
       code, name, description, discount_type, discount_value, minimum_order_amount,
       maximum_discount_amount, valid_from, valid_until, usage_limit, per_user_limit,
       applicable_categories, applicable_products, excluded_categories, excluded_products,
       first_time_users_only, status, created_by
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     returning *`,
    [
      code.toUpperCase().trim(), name, description || null, discountType, discountValue,
      minimumOrderAmount || 0, maximumDiscountAmount ?? null, validFrom, validUntil,
      usageLimit ?? null, perUserLimit || 1, applicableCategories || [], applicableProducts || [],
      excludedCategories || [], excludedProducts || [], Boolean(firstTimeUsersOnly),
      status || 'active', createdBy || null,
    ]
  );
  return rowToCoupon(rows[0]);
};

const COLUMN_MAP = {
  code: 'code', name: 'name', description: 'description', discountType: 'discount_type',
  discountValue: 'discount_value', minimumOrderAmount: 'minimum_order_amount',
  maximumDiscountAmount: 'maximum_discount_amount', validFrom: 'valid_from', validUntil: 'valid_until',
  usageLimit: 'usage_limit', perUserLimit: 'per_user_limit', applicableCategories: 'applicable_categories',
  applicableProducts: 'applicable_products', excludedCategories: 'excluded_categories',
  excludedProducts: 'excluded_products', firstTimeUsersOnly: 'first_time_users_only', status: 'status',
};

const update = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let idx = 1;

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || !COLUMN_MAP[key]) return;
    setClauses.push(`${COLUMN_MAP[key]} = $${idx}`);
    params.push(key === 'code' ? value.toUpperCase().trim() : value);
    idx += 1;
  });

  if (setClauses.length === 0) return findById(id);

  params.push(id);
  const { rows } = await query(`update coupons set ${setClauses.join(', ')} where id = $${idx} returning *`, params);
  return rowToCoupon(rows[0]);
};

const setStatus = async (id, status) => {
  const { rows } = await query('update coupons set status = $2 where id = $1 returning *', [id, status]);
  return rowToCoupon(rows[0]);
};

const expireCoupons = async () => {
  const { rowCount } = await query(
    "update coupons set status = 'expired' where status = 'active' and valid_until < now()"
  );
  return rowCount;
};

module.exports = {
  rowToCoupon,
  findByCode,
  findById,
  recordUsage,
  list,
  create,
  update,
  setStatus,
  expireCoupons,
};
