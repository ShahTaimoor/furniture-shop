const slugify = require('slugify');
const { query } = require('../../config/postgres');

const rowToTag = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    color: row.color || null,
    isActive: row.is_active,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usageCount: row.usage_count !== undefined ? Number(row.usage_count) : undefined,
  };
};

const findByNameOrSlug = async (name, slug, excludeId = null) => {
  const { rows } = excludeId
    ? await query(
        'select * from tags where id != $3 and (lower(name) = lower($1) or slug = $2)',
        [name, slug, excludeId]
      )
    : await query('select * from tags where lower(name) = lower($1) or slug = $2', [name, slug]);
  return rowToTag(rows[0]);
};

const findById = async (id) => {
  const { rows } = await query('select * from tags where id = $1', [id]);
  return rowToTag(rows[0]);
};

const create = async ({ name, description, color, isActive, createdBy }) => {
  const slug = slugify(name, { lower: true, strict: true });
  const { rows } = await query(
    `insert into tags (name, slug, description, color, is_active, created_by, updated_by)
     values ($1, $2, $3, $4, $5, $6, $6)
     returning *`,
    [name, slug, description || '', color || null, isActive !== undefined ? isActive : true, createdBy || null]
  );
  return rowToTag(rows[0]);
};

const update = async (id, fields) => {
  const existing = await findById(id);
  if (!existing) return null;

  const name = fields.name !== undefined ? fields.name : existing.name;
  const slug = fields.name !== undefined ? slugify(fields.name, { lower: true, strict: true }) : existing.slug;
  const description = fields.description !== undefined ? fields.description : existing.description;
  const color = fields.color !== undefined ? fields.color : existing.color;
  const isActive = fields.isActive !== undefined ? fields.isActive : existing.isActive;
  const updatedBy = fields.updatedBy !== undefined ? fields.updatedBy : existing.updatedBy;

  const { rows } = await query(
    `update tags set name = $1, slug = $2, description = $3, color = $4, is_active = $5, updated_by = $6
     where id = $7
     returning *`,
    [name, slug, description, color, isActive, updatedBy, id]
  );
  return rowToTag(rows[0]);
};

const remove = async (id) => {
  await query('delete from tags where id = $1', [id]);
};

const getUsageCount = async (id) => {
  const { rows } = await query(
    `select count(*)::int as count
     from product_tags pt
     join products p on p.id = pt.product_id
     where pt.tag_id = $1 and p.is_deleted = false`,
    [id]
  );
  return rows[0].count;
};

const list = async ({ search, isActive, sort = 'name', order = 'asc', page = 1, limit = 20 }) => {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(name ilike $${params.length} or slug ilike $${params.length} or description ilike $${params.length})`);
  }

  if (isActive === 'true') {
    conditions.push('is_active = true');
  } else if (isActive === 'false') {
    conditions.push('is_active = false');
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

  const sortColumnMap = {
    name: 'name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const sortColumn = sortColumnMap[sort] || 'name';
  const sortOrder = order === 'desc' ? 'desc' : 'asc';

  const countResult = await query(`select count(*) from tags ${whereClause}`, params);
  const total = Number(countResult.rows[0].count);

  let rowsQuery = `select * from tags ${whereClause} order by ${sortColumn} ${sortOrder}`;
  const listParams = [...params];
  if (limit) {
    listParams.push(limit);
    rowsQuery += ` limit $${listParams.length}`;
    listParams.push((page - 1) * limit);
    rowsQuery += ` offset $${listParams.length}`;
  }

  const { rows } = await query(rowsQuery, listParams);

  return { tags: rows.map(rowToTag), total };
};

module.exports = {
  findByNameOrSlug,
  findById,
  create,
  update,
  remove,
  list,
  getUsageCount,
};
