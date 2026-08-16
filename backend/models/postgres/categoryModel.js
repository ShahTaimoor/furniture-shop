const slugify = require('slugify');
const { query } = require('../../config/postgres');

const rowToCategory = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    picture: row.picture_secure_url
      ? {
          secure_url: row.picture_secure_url,
          public_id: row.picture_public_id,
          alt: row.picture_alt,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const generateUniqueSlug = async (name, currentId = null) => {
  let baseSlug = slugify(name || '', { lower: true, strict: true });
  if (!baseSlug) {
    baseSlug = Date.now().toString();
  }

  let slug = baseSlug;
  let counter = 1;

  /* eslint-disable no-await-in-loop */
  while (true) {
    const { rows } = currentId
      ? await query('select 1 from categories where slug = $1 and id != $2', [slug, currentId])
      : await query('select 1 from categories where slug = $1', [slug]);
    if (rows.length === 0) break;
    slug = `${baseSlug}-${counter++}`;
  }
  /* eslint-enable no-await-in-loop */

  return slug;
};

const create = async ({ name, parentId, picture }) => {
  const slug = await generateUniqueSlug(name);
  const { rows } = await query(
    `insert into categories (name, slug, parent_id, picture_secure_url, picture_public_id, picture_alt)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [name, slug, parentId || null, picture?.secure_url || null, picture?.public_id || null, picture?.alt || null]
  );
  return rowToCategory(rows[0]);
};

const findAll = async () => {
  const { rows } = await query('select * from categories order by created_at asc');
  return rows.map(rowToCategory);
};

const findById = async (id) => {
  const { rows } = await query('select * from categories where id = $1', [id]);
  return rowToCategory(rows[0]);
};

const findChildren = async (parentId) => {
  const { rows } = await query('select id from categories where parent_id = $1', [parentId]);
  return rows.map((row) => row.id);
};

const update = async (id, { name, parentId, picture, removeImage }) => {
  const existing = await findById(id);
  if (!existing) return null;

  const nextName = name && name.trim() ? name.trim() : existing.name;
  const slug = name && name.trim() && name.trim() !== existing.name
    ? await generateUniqueSlug(nextName, id)
    : existing.slug;

  let picSecureUrl = existing.picture?.secure_url || null;
  let picPublicId = existing.picture?.public_id || null;
  let picAlt = existing.picture?.alt || null;

  if (removeImage) {
    picSecureUrl = null;
    picPublicId = null;
    picAlt = null;
  } else if (picture) {
    picSecureUrl = picture.secure_url;
    picPublicId = picture.public_id;
    picAlt = picture.alt || nextName;
  }

  const { rows } = await query(
    `update categories
     set name = $1, slug = $2, parent_id = $3,
         picture_secure_url = $4, picture_public_id = $5, picture_alt = $6
     where id = $7
     returning *`,
    [nextName, slug, parentId !== undefined ? parentId : existing.parentId, picSecureUrl, picPublicId, picAlt, id]
  );
  return rowToCategory(rows[0]);
};

const collectDescendantIds = async (categoryId) => {
  const result = new Set([categoryId]);
  const queue = [categoryId];

  /* eslint-disable no-await-in-loop */
  while (queue.length > 0) {
    const current = queue.shift();
    const childIds = await findChildren(current);
    childIds.forEach((id) => {
      if (!result.has(id)) {
        result.add(id);
        queue.push(id);
      }
    });
  }
  /* eslint-enable no-await-in-loop */

  return Array.from(result);
};

const deleteByIds = async (ids) => {
  if (ids.length === 0) return;
  await query('delete from categories where id = any($1::uuid[])', [ids]);
};

const buildTree = (categories) => {
  const map = new Map();
  const roots = [];

  categories.forEach((category) => {
    map.set(category._id, { ...category, children: [] });
  });

  categories.forEach((category) => {
    const node = map.get(category._id);
    if (category.parentId) {
      const parentNode = map.get(category.parentId);
      if (parentNode) {
        parentNode.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

module.exports = {
  create,
  findAll,
  findById,
  findChildren,
  update,
  collectDescendantIds,
  deleteByIds,
  buildTree,
  generateUniqueSlug,
};
