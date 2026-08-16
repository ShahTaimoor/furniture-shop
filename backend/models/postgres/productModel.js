const slugify = require('slugify');
const { query } = require('../../config/postgres');
const categoryModel = require('./categoryModel');
const tagModel = require('./tagModel');

const rowToProduct = (row, { categories = [], tags = [] } = {}) => {
  if (!row) return null;

  const images = row.images || [];
  const primaryImage =
    row.picture_secure_url ||
    images.find((img) => img.isPrimary)?.secure_url ||
    images[0]?.secure_url ||
    null;

  const category = row.category_id
    ? categories.find((c) => c._id === row.category_id) || null
    : null;
  const primaryCategory = row.primary_category_id
    ? categories.find((c) => c._id === row.primary_category_id) || null
    : null;

  const totalInventory =
    Array.isArray(row.variations) && row.variations.length > 0
      ? row.variations.reduce((acc, v) => acc + (v.stock || 0), 0)
      : row.stock || 0;

  return {
    _id: row.id,
    title: row.title,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    brand: row.brand,
    vendor: row.vendor,
    shortDescription: row.short_description,
    sku: row.sku,
    barcode: row.barcode,
    price: Number(row.price),
    costPrice: Number(row.cost_price) || 0,
    salePrice: Number(row.sale_price) || Number(row.price) || 0,
    discount: Number(row.discount) || 0,
    compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : undefined,
    stock: row.stock,
    stockStatus: row.stock_status,
    allowBackorder: row.allow_backorder,
    lowStockThreshold: row.low_stock_threshold,
    categories,
    category,
    primaryCategory,
    tags,
    images,
    picture: row.picture_secure_url
      ? { secure_url: row.picture_secure_url, public_id: row.picture_public_id }
      : null,
    primaryImage,
    image: primaryImage,
    status: row.status,
    visibility: row.visibility,
    isFeatured: row.is_featured,
    isBestseller: row.is_bestseller,
    isOnSale: row.is_on_sale,
    saleStartDate: row.sale_start_date,
    saleEndDate: row.sale_end_date,
    attributes: row.attributes || [],
    variationAttributes: row.variation_attributes || [],
    variations: row.variations || [],
    shipping: {
      weight: row.shipping_weight,
      width: row.shipping_width,
      height: row.shipping_height,
      depth: row.shipping_depth,
      requiresShipping: row.shipping_requires_shipping,
    },
    seo: row.seo || {},
    customFields: row.custom_fields || {},
    flags: row.flags || [],
    minPurchaseQuantity: row.min_purchase_quantity,
    maxPurchaseQuantity: row.max_purchase_quantity,
    totalInventory,
    ratingAverage: Number(row.rating_average) || 0,
    ratingCount: row.rating_count || 0,
    totalSales: row.total_sales || 0,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const buildProduct = (row, categoriesByProduct, tagsByProduct, singleCategoryMap) => {
  const categories = categoriesByProduct.get(row.id) || [];
  const product = rowToProduct(row, { categories, tags: tagsByProduct.get(row.id) || [] });
  if (!product.category && row.category_id) {
    product.category = singleCategoryMap.get(row.category_id) || null;
  }
  if (!product.primaryCategory && row.primary_category_id) {
    product.primaryCategory = singleCategoryMap.get(row.primary_category_id) || null;
  }
  return product;
};

const hydrateRows = async (rows) => {
  if (rows.length === 0) return [];
  const productIds = rows.map((r) => r.id);

  const [categoryLinks, tagLinks, allCategories] = await Promise.all([
    query(
      `select pc.product_id, c.* from product_categories pc
       join categories c on c.id = pc.category_id
       where pc.product_id = any($1::uuid[])`,
      [productIds]
    ),
    query(
      `select pt.product_id, t.* from product_tags pt
       join tags t on t.id = pt.tag_id
       where pt.product_id = any($1::uuid[])`,
      [productIds]
    ),
    query('select * from categories'),
  ]);

  const categoriesByProduct = new Map();
  categoryLinks.rows.forEach((row) => {
    const list = categoriesByProduct.get(row.product_id) || [];
    list.push({
      _id: row.id,
      name: row.name,
      slug: row.slug,
      image: row.picture_secure_url || null,
      picture: row.picture_secure_url ? { secure_url: row.picture_secure_url } : null,
    });
    categoriesByProduct.set(row.product_id, list);
  });

  const tagsByProduct = new Map();
  tagLinks.rows.forEach((row) => {
    const list = tagsByProduct.get(row.product_id) || [];
    list.push({ _id: row.id, name: row.name, slug: row.slug, color: row.color, isActive: row.is_active });
    tagsByProduct.set(row.product_id, list);
  });

  const singleCategoryMap = new Map(
    allCategories.rows.map((row) => [
      row.id,
      {
        _id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.picture_secure_url || null,
        picture: row.picture_secure_url ? { secure_url: row.picture_secure_url } : null,
      },
    ])
  );

  return rows.map((row) => buildProduct(row, categoriesByProduct, tagsByProduct, singleCategoryMap));
};

const generateUniqueSlug = async (title, currentId = null) => {
  let baseSlug = slugify(title || '', { lower: true, strict: true });
  if (!baseSlug) baseSlug = Date.now().toString();

  let slug = baseSlug;
  let counter = 1;

  /* eslint-disable no-await-in-loop */
  while (true) {
    const { rows } = currentId
      ? await query('select 1 from products where slug = $1 and id != $2', [slug, currentId])
      : await query('select 1 from products where slug = $1', [slug]);
    if (rows.length === 0) break;
    slug = `${baseSlug}-${counter++}`;
  }
  /* eslint-enable no-await-in-loop */

  return slug;
};

const setProductCategories = async (productId, categoryIds) => {
  await query('delete from product_categories where product_id = $1', [productId]);
  if (categoryIds.length > 0) {
    const values = categoryIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await query(`insert into product_categories (product_id, category_id) values ${values}`, [productId, ...categoryIds]);
  }
};

const setProductTags = async (productId, tagIds) => {
  await query('delete from product_tags where product_id = $1', [productId]);
  if (tagIds.length > 0) {
    const values = tagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await query(`insert into product_tags (product_id, tag_id) values ${values}`, [productId, ...tagIds]);
  }
};

const resolveCategoryIds = async (identifiers) => {
  const list = Array.isArray(identifiers) ? identifiers : identifiers ? [identifiers] : [];
  const resolved = new Set();
  for (const identifier of list) {
    if (!identifier) continue;
    const category = await categoryModel.findById(identifier);
    if (category) resolved.add(category._id);
  }
  return Array.from(resolved);
};

const resolveTagIds = async (names, userId) => {
  const list = Array.isArray(names) ? names : names ? [names] : [];
  const resolved = new Set();
  for (const rawName of list) {
    const name = typeof rawName === 'string' ? rawName.trim() : rawName?.value || rawName?.name;
    if (!name) continue;
    const slug = slugify(name, { lower: true, strict: true });
    let tag = await tagModel.findByNameOrSlug(name, slug);
    if (!tag) {
      tag = await tagModel.create({ name, createdBy: userId });
    }
    resolved.add(tag._id);
  }
  return Array.from(resolved);
};

const getDescendantCategoryIds = async (categoryId) => {
  const { rows } = await query(
    `with recursive descendants as (
       select id from categories where id = $1
       union all
       select c.id from categories c inner join descendants d on c.parent_id = d.id
     )
     select id from descendants`,
    [categoryId]
  );
  return rows.map((r) => r.id);
};

const insertProduct = async (fields) => {
  const {
    title, name, slug, description, brand, vendor, shortDescription, sku, barcode,
    price, costPrice, salePrice, discount, compareAtPrice, stock, stockStatus,
    allowBackorder, lowStockThreshold, primaryCategoryId, categoryId,
    pictureSecureUrl, picturePublicId, status, visibility, isFeatured, isBestseller,
    isOnSale, saleStartDate, saleEndDate, images, attributes, variationAttributes,
    variations, seo, customFields, flags, minPurchaseQuantity, maxPurchaseQuantity,
    createdByUser, publishedAt,
  } = fields;

  const { rows } = await query(
    `insert into products (
       title, name, slug, description, brand, vendor, short_description, sku, barcode,
       price, cost_price, sale_price, discount, compare_at_price, stock, stock_status,
       allow_backorder, low_stock_threshold, primary_category_id, category_id,
       picture_secure_url, picture_public_id, status, visibility, is_featured, is_bestseller,
       is_on_sale, sale_start_date, sale_end_date, images, attributes, variation_attributes,
       variations, seo, custom_fields, flags, min_purchase_quantity, max_purchase_quantity,
       created_by_user, published_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
       $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40
     ) returning *`,
    [
      title, name, slug, description || '', brand || null, vendor || null, shortDescription || null,
      sku || null, barcode || null, price, costPrice || 0, salePrice || 0, discount || 0,
      compareAtPrice ?? null, stock || 0, stockStatus || 'in-stock', allowBackorder || false,
      lowStockThreshold || 0, primaryCategoryId || null, categoryId || null,
      pictureSecureUrl || null, picturePublicId || null, status || 'active', visibility || 'public',
      isFeatured || false, isBestseller || false, isOnSale || false, saleStartDate || null,
      saleEndDate || null, JSON.stringify(images || []), JSON.stringify(attributes || []),
      variationAttributes || [], JSON.stringify(variations || []), JSON.stringify(seo || {}),
      JSON.stringify(customFields || {}), flags || [], minPurchaseQuantity || 1,
      maxPurchaseQuantity || null, createdByUser || null, publishedAt || null,
    ]
  );
  return rows[0];
};

const COLUMN_MAP = {
  title: 'title', name: 'name', description: 'description', brand: 'brand', vendor: 'vendor',
  shortDescription: 'short_description', sku: 'sku', barcode: 'barcode', price: 'price',
  costPrice: 'cost_price', salePrice: 'sale_price', discount: 'discount',
  compareAtPrice: 'compare_at_price', stock: 'stock', stockStatus: 'stock_status',
  allowBackorder: 'allow_backorder', lowStockThreshold: 'low_stock_threshold',
  primaryCategoryId: 'primary_category_id', categoryId: 'category_id',
  pictureSecureUrl: 'picture_secure_url', picturePublicId: 'picture_public_id',
  status: 'status', visibility: 'visibility', isFeatured: 'is_featured',
  isBestseller: 'is_bestseller', isOnSale: 'is_on_sale', saleStartDate: 'sale_start_date',
  saleEndDate: 'sale_end_date', slug: 'slug', publishedAt: 'published_at',
  minPurchaseQuantity: 'min_purchase_quantity', maxPurchaseQuantity: 'max_purchase_quantity',
};

const JSON_FIELDS = new Set(['images', 'attributes', 'variations', 'seo', 'customFields']);
const JSON_COLUMN_MAP = { images: 'images', attributes: 'attributes', variations: 'variations', seo: 'seo', customFields: 'custom_fields' };
const ARRAY_FIELDS = new Set(['variationAttributes', 'flags']);
const ARRAY_COLUMN_MAP = { variationAttributes: 'variation_attributes', flags: 'flags' };

const updateProductById = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let idx = 1;

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined) return;
    if (JSON_FIELDS.has(key)) {
      setClauses.push(`${JSON_COLUMN_MAP[key]} = $${idx}`);
      params.push(JSON.stringify(value));
      idx += 1;
    } else if (ARRAY_FIELDS.has(key)) {
      setClauses.push(`${ARRAY_COLUMN_MAP[key]} = $${idx}`);
      params.push(value);
      idx += 1;
    } else if (COLUMN_MAP[key]) {
      setClauses.push(`${COLUMN_MAP[key]} = $${idx}`);
      params.push(value);
      idx += 1;
    }
  });

  if (setClauses.length === 0) {
    const { rows } = await query('select * from products where id = $1', [id]);
    return rows[0];
  }

  params.push(id);
  const { rows } = await query(
    `update products set ${setClauses.join(', ')} where id = $${idx} returning *`,
    params
  );
  return rows[0];
};

const findRawById = async (id) => {
  const { rows } = await query('select * from products where id = $1', [id]);
  return rows[0] || null;
};

const findRawBySlug = async (slug) => {
  const { rows } = await query('select * from products where slug = $1 and is_deleted = false', [slug]);
  return rows[0] || null;
};

const softDeleteById = async (id, deletedBy) => {
  const { rows } = await query(
    `update products set is_deleted = true, status = 'archived', deleted_at = now(), deleted_by = $2
     where id = $1 returning *`,
    [id, deletedBy || null]
  );
  return rows[0];
};

const hardDeleteById = async (id) => {
  await query('delete from products where id = $1', [id]);
};

const restoreById = async (id, status) => {
  const { rows } = await query(
    `update products set is_deleted = false, deleted_at = null, deleted_by = null, status = $2
     where id = $1 returning *`,
    [id, status || 'inactive']
  );
  return rows[0];
};

const buildFilterClause = async ({
  category, tagIds, minPrice, maxPrice, statusFilter, visibility,
  productIds, featured, bestseller, onSale, stockFilter,
}) => {
  const conditions = ['is_deleted = false'];
  const params = [];
  let idx = 1;

  if (stockFilter !== 'out-of-stock') {
    conditions.push('stock > 0');
  }
  if (stockFilter === 'active') {
    conditions.push(`stock_status in ('in-stock','backorder','preorder')`);
  } else if (stockFilter === 'out-of-stock') {
    conditions.push(`stock_status = 'out-of-stock'`);
  } else if (stockFilter === 'backorder') {
    conditions.push(`stock_status = 'backorder'`);
  } else if (stockFilter === 'preorder') {
    conditions.push(`stock_status = 'preorder'`);
  }

  if (statusFilter && ['active', 'inactive', 'draft', 'archived'].includes(statusFilter)) {
    params.push(statusFilter);
    conditions.push(`status = $${idx}`);
    idx += 1;
  }

  if (visibility && ['public', 'private', 'hidden'].includes(visibility)) {
    params.push(visibility);
    conditions.push(`visibility = $${idx}`);
    idx += 1;
  }

  if (productIds && productIds.length > 0) {
    params.push(productIds);
    conditions.push(`id = any($${idx}::uuid[])`);
    idx += 1;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    if (minPrice !== undefined) {
      params.push(minPrice);
      conditions.push(`price >= $${idx}`);
      idx += 1;
    }
    if (maxPrice !== undefined) {
      params.push(maxPrice);
      conditions.push(`price <= $${idx}`);
      idx += 1;
    }
  }

  if (tagIds && tagIds.length > 0) {
    params.push(tagIds);
    conditions.push(`exists (select 1 from product_tags pt where pt.product_id = products.id and pt.tag_id = any($${idx}::uuid[]))`);
    idx += 1;
  }

  if (featured) {
    conditions.push('is_featured = true');
  }
  if (bestseller) {
    conditions.push('is_bestseller = true');
  }
  if (onSale) {
    conditions.push(`is_on_sale = true and (sale_end_date is null or sale_end_date >= now())`);
  }

  if (category) {
    const descendantIds = await getDescendantCategoryIds(category);
    const idsToMatch = descendantIds.length > 0 ? descendantIds : [category];
    params.push(idsToMatch);
    conditions.push(
      `(category_id = any($${idx}::uuid[]) or primary_category_id = any($${idx}::uuid[]) or exists (select 1 from product_categories pcat where pcat.product_id = products.id and pcat.category_id = any($${idx}::uuid[])))`
    );
    idx += 1;
  }

  return { whereClause: conditions.join(' and '), params, nextIdx: idx };
};

const SORT_MAP = {
  az: 'title asc',
  za: 'title desc',
  'price-low': 'price asc',
  'price-high': 'price desc',
  newest: 'created_at desc',
  oldest: 'created_at asc',
  'stock-high': 'stock desc',
  'stock-low': 'stock asc',
  popularity: 'total_sales desc, rating_count desc, created_at desc',
  bestsellers: 'total_sales desc, rating_count desc, created_at desc',
  featured: 'is_featured desc, created_at desc',
  sale: 'is_on_sale desc, sale_end_date asc, created_at desc',
};

const listProducts = async ({
  category, search, page = 1, limit = 24, stockFilter = 'all', sortBy = 'az',
  productIds, tagIds, minPrice, maxPrice, statusFilter, featured, bestseller,
  onSale, visibility,
}) => {
  const { whereClause, params, nextIdx } = await buildFilterClause({
    category, tagIds, minPrice, maxPrice, statusFilter, visibility,
    productIds, featured, bestseller, onSale, stockFilter,
  });

  let idx = nextIdx;
  let searchClause = '';
  let orderClause = SORT_MAP[sortBy] || 'title asc';

  if (search && search.trim()) {
    params.push(search.trim());
    searchClause = ` and search_vector @@ websearch_to_tsquery('english', $${idx})`;
    orderClause = `ts_rank(search_vector, websearch_to_tsquery('english', $${idx})) desc, ${orderClause}`;
    idx += 1;
  }

  const fullWhere = `${whereClause}${searchClause}`;

  const countResult = await query(`select count(*) from products where ${fullWhere}`, params);
  const total = Number(countResult.rows[0].count);

  let rowsQuery = `select * from products where ${fullWhere} order by ${orderClause}`;
  const listParams = [...params];
  if (limit) {
    listParams.push(limit);
    rowsQuery += ` limit $${listParams.length}`;
    listParams.push((page - 1) * limit);
    rowsQuery += ` offset $${listParams.length}`;
  }

  const { rows } = await query(rowsQuery, listParams);
  const products = await hydrateRows(rows);

  return { products, total };
};

const listNewArrivals = async (limitNum) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { rows } = await query(
    `select * from products
     where is_deleted = false and status = 'active' and visibility = 'public' and stock > 0
       and (created_at >= $1 or is_featured = true)
     order by created_at desc
     limit $2`,
    [thirtyDaysAgo, limitNum]
  );
  const total = rows.length;
  const products = await hydrateRows(rows);
  return { products, total };
};

const searchSuggestions = async (searchTerm, limit) => {
  const { rows } = await query(
    `select id, slug, title, picture_secure_url, price, stock,
            left(description, 100) as description,
            ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank
     from products
     where is_deleted = false and stock > 0 and search_vector @@ websearch_to_tsquery('english', $1)
     order by rank desc, created_at desc
     limit $2`,
    [searchTerm, limit]
  );

  return rows.map((row) => ({
    _id: row.id,
    slug: row.slug,
    title: row.title,
    image: row.picture_secure_url || null,
    price: Number(row.price),
    stock: row.stock,
    description: row.description || '',
  }));
};

// Deducts stock for a checkout line item (product or a specific variation), and bumps
// totalSales — mirrors the per-item logic the Mongo order routes used to do inline.
// Returns { product, variation, error } — error is a user-facing message if the item can't be fulfilled.
const deductStockForOrderItem = async (productId, quantity, { variationId, variationSku } = {}) => {
  const row = await findRawById(productId);
  if (!row || row.is_deleted) {
    return { error: `Product not found: ${productId}` };
  }
  const product = rowToProduct(row);

  let variation = null;
  if (variationId) {
    variation = (product.variations || []).find((v) => v.id === variationId);
  }
  if (!variation && variationSku) {
    variation = (product.variations || []).find((v) => v.sku === variationSku);
  }

  if (variation) {
    if (variation.status !== 'active') {
      return { error: `Selected variation is inactive for product: ${product.title}` };
    }
    if ((variation.stock ?? 0) < quantity && !variation.allowBackorder && !product.allowBackorder) {
      return { error: `Not enough stock for ${product.title} (${variation.name}). Available: ${variation.stock}` };
    }
    const updatedVariations = product.variations.map((v) =>
      v.id === variation.id ? { ...v, stock: Math.max((v.stock || 0) - quantity, 0) } : v
    );
    await query('update products set variations = $2, total_sales = total_sales + $3 where id = $1', [
      productId,
      JSON.stringify(updatedVariations),
      quantity,
    ]);
    return { product, variation: updatedVariations.find((v) => v.id === variation.id) };
  }

  if ((product.stock ?? 0) < quantity && !product.allowBackorder) {
    return { error: `Not enough stock for product: ${product.title}` };
  }
  await query(
    'update products set stock = greatest(stock - $2, 0), total_sales = total_sales + $2 where id = $1',
    [productId, quantity]
  );
  return { product, variation: null };
};

// Restores stock for a cancelled/deleted order's line item — inverse of deductStockForOrderItem.
const restoreStockForOrderItem = async (productId, quantity, { variationId } = {}) => {
  const row = await findRawById(productId);
  if (!row) return;
  const product = rowToProduct(row);

  if (variationId && Array.isArray(product.variations) && product.variations.length > 0) {
    const updatedVariations = product.variations.map((v) =>
      v.id === variationId ? { ...v, stock: (v.stock || 0) + quantity } : v
    );
    await query('update products set variations = $2, total_sales = greatest(total_sales - $3, 0) where id = $1', [
      productId,
      JSON.stringify(updatedVariations),
      quantity,
    ]);
    return;
  }

  await query(
    'update products set stock = stock + $2, total_sales = greatest(total_sales - $2, 0) where id = $1',
    [productId, quantity]
  );
};

module.exports = {
  rowToProduct,
  hydrateRows,
  generateUniqueSlug,
  setProductCategories,
  setProductTags,
  resolveCategoryIds,
  resolveTagIds,
  getDescendantCategoryIds,
  insertProduct,
  updateProductById,
  findRawById,
  findRawBySlug,
  softDeleteById,
  hardDeleteById,
  restoreById,
  listProducts,
  listNewArrivals,
  searchSuggestions,
  deductStockForOrderItem,
  restoreStockForOrderItem,
};
