const { query } = require('../../config/postgres');

const STATIC_PLACEMENTS = ['hero_0', 'hero_1', 'hero_2', 'hero_3', 'hero_4', 'hero_5'];

const isValidPlacement = (value = '') => {
  if (STATIC_PLACEMENTS.includes(value)) return true;
  return /^hero_\d+$/.test(value);
};

const rowToBanner = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: {
      secure_url: row.image_secure_url,
      public_id: row.image_public_id,
    },
    redirectLink: row.redirect_link,
    placement: row.placement,
    status: row.status,
    displayOrder: row.display_order,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const create = async ({ title, subtitle, redirectLink, placement, status, displayOrder, image }) => {
  const { rows } = await query(
    `insert into banners (title, subtitle, redirect_link, placement, status, display_order, image_secure_url, image_public_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [
      title || '',
      subtitle || '',
      redirectLink || '',
      placement,
      status === 'inactive' ? 'inactive' : 'active',
      Number.isFinite(displayOrder) ? displayOrder : 0,
      image.secure_url,
      image.public_id,
    ]
  );
  return rowToBanner(rows[0]);
};

const findAll = async (status) => {
  const { rows } = status
    ? await query('select * from banners where status = $1 order by placement asc, display_order asc, created_at desc', [status])
    : await query('select * from banners order by placement asc, display_order asc, created_at desc');
  return rows.map(rowToBanner);
};

const findByPlacement = async (placement) => {
  const { rows } = await query(
    'select * from banners where placement = $1 and status = $2 order by display_order asc, created_at desc',
    [placement, 'active']
  );
  return rows.map(rowToBanner);
};

const findById = async (id) => {
  const { rows } = await query('select * from banners where id = $1', [id]);
  return rowToBanner(rows[0]);
};

const update = async (id, updates) => {
  const existing = await findById(id);
  if (!existing) return null;

  const next = {
    title: updates.title !== undefined ? updates.title : existing.title,
    subtitle: updates.subtitle !== undefined ? updates.subtitle : existing.subtitle,
    redirectLink: updates.redirectLink !== undefined ? updates.redirectLink : existing.redirectLink,
    placement: updates.placement !== undefined ? updates.placement : existing.placement,
    status: updates.status !== undefined ? updates.status : existing.status,
    displayOrder: updates.displayOrder !== undefined ? updates.displayOrder : existing.displayOrder,
    imageSecureUrl: updates.image ? updates.image.secure_url : existing.image.secure_url,
    imagePublicId: updates.image ? updates.image.public_id : existing.image.public_id,
  };

  const { rows } = await query(
    `update banners
     set title = $1, subtitle = $2, redirect_link = $3, placement = $4, status = $5,
         display_order = $6, image_secure_url = $7, image_public_id = $8
     where id = $9
     returning *`,
    [
      next.title,
      next.subtitle,
      next.redirectLink,
      next.placement,
      next.status,
      next.displayOrder,
      next.imageSecureUrl,
      next.imagePublicId,
      id,
    ]
  );
  return rowToBanner(rows[0]);
};

const deleteById = async (id) => {
  await query('delete from banners where id = $1', [id]);
};

module.exports = {
  isValidPlacement,
  create,
  findAll,
  findByPlacement,
  findById,
  update,
  deleteById,
};
