const { query } = require('../../config/postgres');

const AVAILABILITY_MAP = {
  in: 'in-stock',
  instock: 'in-stock',
  'in-stock': 'in-stock',
  available: 'in-stock',
  out: 'out-of-stock',
  'out-of-stock': 'out-of-stock',
  preorder: 'preorder',
  backorder: 'backorder',
};

const SORT_MAP = {
  relevance: null, // handled specially — ranked by ts_rank / totalSales
  'price-asc': 'effective_price asc, created_at desc',
  'price-desc': 'effective_price desc, created_at desc',
  latest: 'created_at desc',
  featured: 'is_featured desc, total_sales desc',
};

const buildFilterClause = async (filters) => {
  const conditions = ["is_deleted = false", "status = 'active'", "visibility != 'hidden'"];
  const params = [];
  let idx = 1;

  if (filters.categoryIds?.length) {
    params.push(filters.categoryIds);
    conditions.push(
      `(category_id = any($${idx}::uuid[]) or exists (select 1 from product_categories pc where pc.product_id = products.id and pc.category_id = any($${idx}::uuid[])))`
    );
    idx += 1;
  }

  if (filters.availability?.length) {
    params.push(filters.availability);
    conditions.push(`stock_status = any($${idx}::text[])`);
    idx += 1;
  }

  if (filters.brands?.length) {
    params.push(filters.brands);
    conditions.push(`brand = any($${idx}::text[])`);
    idx += 1;
  }

  if (filters.colors?.length) {
    params.push(filters.colors);
    conditions.push(
      `exists (select 1 from jsonb_array_elements(attributes) attr where lower(attr->>'name') = 'color' and attr->>'value' = any($${idx}::text[]))`
    );
    idx += 1;
  }

  if (filters.sizes?.length) {
    params.push(filters.sizes);
    conditions.push(
      `exists (select 1 from jsonb_array_elements(attributes) attr where lower(attr->>'name') = 'size' and attr->>'value' = any($${idx}::text[]))`
    );
    idx += 1;
  }

  if (typeof filters.minPrice === 'number') {
    params.push(filters.minPrice);
    conditions.push(`coalesce(nullif(sale_price, 0), price) >= $${idx}`);
    idx += 1;
  }

  if (typeof filters.maxPrice === 'number') {
    params.push(filters.maxPrice);
    conditions.push(`coalesce(nullif(sale_price, 0), price) <= $${idx}`);
    idx += 1;
  }

  return { whereClause: conditions.join(' and '), params, nextIdx: idx };
};

const rowToSearchProduct = (row) => {
  const images = row.images || [];
  const primaryImage = images.find((img) => img.isPrimary)?.secure_url || images[0]?.secure_url || row.picture_secure_url || null;

  return {
    id: row.id,
    _id: row.id,
    title: row.title,
    slug: row.slug,
    brand: row.brand || null,
    price: Number(row.price),
    salePrice: row.sale_price && Number(row.sale_price) > 0 ? Number(row.sale_price) : null,
    effectivePrice: row.sale_price && Number(row.sale_price) > 0 ? Number(row.sale_price) : Number(row.price),
    stockStatus: row.stock_status,
    stock: row.stock ?? 0,
    totalSales: row.total_sales || 0,
    ratingAverage: Number(row.rating_average) || 0,
    categories: [],
    tags: [],
    description: row.description || '',
    sku: row.sku,
    image: primaryImage,
    images,
    createdAt: row.created_at,
  };
};

const searchProducts = async ({ searchTerm, filters, sortBy, page, limit }) => {
  const { whereClause, params, nextIdx } = await buildFilterClause(filters);
  let idx = nextIdx;
  let searchClause = '';
  let orderBy = SORT_MAP[sortBy] || null;

  if (searchTerm) {
    params.push(searchTerm);
    searchClause = ` and search_vector @@ websearch_to_tsquery('english', $${idx})`;
    if (!orderBy) {
      orderBy = `ts_rank(search_vector, websearch_to_tsquery('english', $${idx})) desc, total_sales desc`;
    }
    idx += 1;
  } else if (!orderBy) {
    orderBy = 'total_sales desc, created_at desc';
  }

  const fullWhere = `${whereClause}${searchClause}`;
  const countResult = await query(`select count(*) from products where ${fullWhere}`, params);
  const total = Number(countResult.rows[0].count);

  const listParams = [...params, limit, (page - 1) * limit];
  const { rows } = await query(
    `select *, coalesce(nullif(sale_price, 0), price) as effective_price from products where ${fullWhere} order by ${orderBy} limit $${listParams.length - 1} offset $${listParams.length}`,
    listParams
  );

  return { products: rows.map(rowToSearchProduct), total };
};

// Fuzzy fallback when full-text search returns too few results (mirrors the Mongo regex fallback)
const fuzzySearchProducts = async ({ searchTerm, filters, excludeIds, limit }) => {
  const { whereClause, params, nextIdx } = await buildFilterClause(filters);
  let idx = nextIdx;
  const conditions = [whereClause];

  if (excludeIds?.length) {
    params.push(excludeIds);
    conditions.push(`id != all($${idx}::uuid[])`);
    idx += 1;
  }

  params.push(`%${searchTerm}%`);
  conditions.push(`(title ilike $${idx} or description ilike $${idx} or sku ilike $${idx} or brand ilike $${idx})`);
  idx += 1;

  const fullWhere = conditions.join(' and ');
  const countResult = await query(`select count(*) from products where ${fullWhere}`, params);
  const total = Number(countResult.rows[0].count);

  const listParams = [...params, limit];
  const { rows } = await query(
    `select *, coalesce(nullif(sale_price, 0), price) as effective_price from products where ${fullWhere} order by total_sales desc limit $${listParams.length}`,
    listParams
  );

  return { products: rows.map(rowToSearchProduct), total };
};

const getFacets = async (filters) => {
  const { whereClause, params } = await buildFilterClause(filters);

  const [priceResult, brandResult, availabilityResult, colorResult, sizeResult, categoryResult] = await Promise.all([
    query(
      `select min(coalesce(nullif(sale_price, 0), price)) as min, max(coalesce(nullif(sale_price, 0), price)) as max from products where ${whereClause}`,
      params
    ),
    query(
      `select brand as label, count(*) as count from products where ${whereClause} and brand is not null group by brand order by count(*) desc limit 20`,
      params
    ),
    query(
      `select stock_status as label, count(*) as count from products where ${whereClause} group by stock_status`,
      params
    ),
    query(
      `select attr->>'value' as label, count(*) as count
       from products, jsonb_array_elements(attributes) attr
       where ${whereClause} and lower(attr->>'name') = 'color'
       group by attr->>'value' order by count(*) desc limit 20`,
      params
    ),
    query(
      `select attr->>'value' as label, count(*) as count
       from products, jsonb_array_elements(attributes) attr
       where ${whereClause} and lower(attr->>'name') = 'size'
       group by attr->>'value' order by count(*) desc limit 20`,
      params
    ),
    query(
      `select c.id, c.name, c.slug, count(*) as count
       from products p
       join product_categories pc on pc.product_id = p.id
       join categories c on c.id = pc.category_id
       where ${whereClause.replace(/products\./g, 'p.')}
       group by c.id, c.name, c.slug order by count(*) desc limit 20`,
      params
    ),
  ]);

  return {
    price: { min: priceResult.rows[0]?.min !== null ? Number(priceResult.rows[0].min) : null, max: priceResult.rows[0]?.max !== null ? Number(priceResult.rows[0].max) : null },
    brands: brandResult.rows.map((r) => ({ label: r.label, value: r.label, count: Number(r.count) })),
    availability: availabilityResult.rows.map((r) => ({ label: r.label, value: r.label, count: Number(r.count) })),
    colors: colorResult.rows.map((r) => ({ label: r.label, value: r.label, count: Number(r.count) })),
    sizes: sizeResult.rows.map((r) => ({ label: r.label, value: r.label, count: Number(r.count) })),
    categories: categoryResult.rows.map((r) => ({ label: r.name, value: r.id, slug: r.slug, count: Number(r.count) })),
  };
};

const getPredictiveSuggestions = async (searchTerm, limit) => {
  const productsPromise = query(
    `select id, title, slug, price, sale_price, brand, stock_status, images, picture_secure_url
     from products
     where is_deleted = false and status = 'active' and visibility != 'hidden'
       and (title ilike $1 or sku ilike $1 or brand ilike $1)
     order by total_sales desc, created_at desc
     limit $2`,
    [`%${searchTerm}%`, limit]
  );
  const categoriesPromise = query(
    `select id, name, slug, picture_secure_url from categories where name ilike $1 limit 5`,
    [`%${searchTerm}%`]
  );
  const tagsPromise = query(`select id, name, slug from tags where name ilike $1 limit 8`, [`%${searchTerm}%`]);

  const [productRows, categoryRows, tagRows] = await Promise.all([productsPromise, categoriesPromise, tagsPromise]);

  return {
    products: productRows.rows.map((row) => {
      const images = row.images || [];
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        brand: row.brand || null,
        price: Number(row.price),
        salePrice: row.sale_price && Number(row.sale_price) > 0 ? Number(row.sale_price) : null,
        stockStatus: row.stock_status,
        image: images.find((img) => img.isPrimary)?.secure_url || images[0]?.secure_url || row.picture_secure_url || null,
      };
    }),
    categories: categoryRows.rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, image: row.picture_secure_url || null })),
    tags: tagRows.rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
  };
};

module.exports = {
  AVAILABILITY_MAP,
  searchProducts,
  fuzzySearchProducts,
  getFacets,
  getPredictiveSuggestions,
};
