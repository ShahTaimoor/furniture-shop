const { query } = require('../../config/postgres');

const rowToReview = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    product: row.product_id,
    user: row.user_id,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    photos: row.photos || [],
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    flaggedReason: row.flagged_reason,
    helpfulCount: row.helpful_count,
    helpfulBy: row.helpful_by || [],
    isEdited: row.is_edited,
    adminResponse: row.admin_response_message
      ? { message: row.admin_response_message, respondedBy: row.admin_response_by, respondedAt: row.admin_response_at }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const recalculateProductRating = async (productId) => {
  const { rows } = await query(
    'select avg(rating)::numeric as avg_rating, count(*) as count from reviews where product_id = $1',
    [productId]
  );
  const avgRating = rows[0]?.count > 0 ? Number(Number(rows[0].avg_rating).toFixed(2)) : 0;
  const count = Number(rows[0]?.count || 0);

  await query('update products set rating_average = $2, rating_count = $3 where id = $1', [
    productId, avgRating, count,
  ]);
};

const findById = async (id) => {
  const { rows } = await query('select * from reviews where id = $1', [id]);
  return rowToReview(rows[0]);
};

const findByProductAndUser = async (productId, userId) => {
  const { rows } = await query('select * from reviews where product_id = $1 and user_id = $2', [productId, userId]);
  return rowToReview(rows[0]);
};

const create = async ({ productId, userId, rating, title, comment }) => {
  const { rows } = await query(
    `insert into reviews (product_id, user_id, rating, title, comment) values ($1,$2,$3,$4,$5) returning *`,
    [productId, userId, rating, title || null, comment || null]
  );
  await recalculateProductRating(productId);
  return rowToReview(rows[0]);
};

const update = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let idx = 1;

  if (fields.rating !== undefined) { setClauses.push(`rating = $${idx}`); params.push(fields.rating); idx += 1; }
  if (fields.title !== undefined) { setClauses.push(`title = $${idx}`); params.push(fields.title); idx += 1; }
  if (fields.comment !== undefined) { setClauses.push(`comment = $${idx}`); params.push(fields.comment); idx += 1; }
  setClauses.push('is_edited = true');

  if (setClauses.length === 1) return findById(id);

  params.push(id);
  const { rows } = await query(`update reviews set ${setClauses.join(', ')} where id = $${idx} returning *`, params);

  if (fields.rating !== undefined) {
    await recalculateProductRating(rows[0].product_id);
  }
  return rowToReview(rows[0]);
};

const remove = async (id) => {
  const { rows } = await query('delete from reviews where id = $1 returning product_id', [id]);
  if (rows[0]) {
    await recalculateProductRating(rows[0].product_id);
  }
};

const setAdminResponse = async (id, { message, respondedBy }) => {
  const { rows } = await query(
    `update reviews set admin_response_message = $2, admin_response_by = $3, admin_response_at = $4 where id = $1 returning *`,
    [id, message || null, message ? respondedBy : null, message ? new Date() : null]
  );
  return rowToReview(rows[0]);
};

const listByProduct = async ({ productId, page = 1, limit = 10, sort = 'recent' }) => {
  const sortMap = {
    recent: 'created_at desc',
    oldest: 'created_at asc',
    highest: 'rating desc, created_at desc',
    lowest: 'rating asc, created_at desc',
  };
  const orderBy = sortMap[sort] || sortMap.recent;

  const countResult = await query('select count(*) from reviews where product_id = $1', [productId]);
  const total = Number(countResult.rows[0].count);

  const { rows } = await query(
    `select * from reviews where product_id = $1 order by ${orderBy} limit $2 offset $3`,
    [productId, limit, (page - 1) * limit]
  );
  return { reviews: rows.map(rowToReview), total };
};

const listAll = async ({ page = 1, limit = 20, sort = 'recent' }) => {
  const sortMap = {
    recent: 'created_at desc',
    oldest: 'created_at asc',
    highest: 'rating desc, created_at desc',
    lowest: 'rating asc, created_at desc',
  };
  const orderBy = sortMap[sort] || sortMap.recent;

  const countResult = await query('select count(*) from reviews');
  const total = Number(countResult.rows[0].count);

  const { rows } = await query(`select * from reviews order by ${orderBy} limit $1 offset $2`, [
    limit, (page - 1) * limit,
  ]);
  return { reviews: rows.map(rowToReview), total };
};

module.exports = {
  rowToReview,
  findById,
  findByProductAndUser,
  create,
  update,
  remove,
  setAdminResponse,
  listByProduct,
  listAll,
  recalculateProductRating,
};
