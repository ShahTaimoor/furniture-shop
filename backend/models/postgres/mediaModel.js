const { query } = require('../../config/postgres');

const rowToMedia = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    originalName: row.original_name,
    url: row.url,
    public_id: row.public_id,
    size: Number(row.size),
    type: row.type,
    folder: row.folder,
    uploadedBy: row.uploaded_by,
    tags: row.tags,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const create = async ({ name, originalName, url, publicId, size, type, uploadedBy }) => {
  const { rows } = await query(
    `insert into media (name, original_name, url, public_id, size, type, uploaded_by)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [name, originalName, url, publicId, size, type, uploadedBy]
  );
  return rowToMedia(rows[0]);
};

const findAll = async ({ search, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(name ilike $${params.length} or original_name ilike $${params.length} or description ilike $${params.length})`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await query(
    `select * from media ${where} order by created_at desc limit $${limitIdx} offset $${offsetIdx}`,
    params
  );

  const { rows: countRows } = await query(`select count(*)::int as total from media ${where}`, params.slice(0, conditions.length));

  return { media: rows.map(rowToMedia), total: countRows[0].total };
};

const findById = async (id) => {
  const { rows } = await query('select * from media where id = $1', [id]);
  return rowToMedia(rows[0]);
};

const findByIds = async (ids) => {
  const { rows } = await query('select * from media where id = any($1::uuid[])', [ids]);
  return rows.map(rowToMedia);
};

const deleteById = async (id) => {
  await query('delete from media where id = $1', [id]);
};

const deleteByIds = async (ids) => {
  const { rows } = await query('delete from media where id = any($1::uuid[]) returning id', [ids]);
  return rows.length;
};

module.exports = {
  create,
  findAll,
  findById,
  findByIds,
  deleteById,
  deleteByIds,
};
