const dotenv = require('dotenv');
const dns = require('dns');
const mongoose = require('mongoose');
dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MongoProduct = require('../models/Product');
const MongoTag = require('../models/Tag');
const MongoCategory = require('../models/Category');
const { query, pool } = require('../config/postgres');
const productModel = require('../models/postgres/productModel');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const products = await MongoProduct.find().sort({ createdAt: 1 }).lean();
  console.log(`Found ${products.length} products in MongoDB`);

  // Build Mongo category id -> Postgres category id map, matched by slug
  const { rows: pgCategories } = await query('select id, slug from categories');
  const pgCategoryBySlug = new Map(pgCategories.map((c) => [c.slug, c.id]));

  const mongoCategories = await MongoCategory.find().lean();
  const mongoCatIdToPgId = new Map();
  mongoCategories.forEach((cat) => {
    const pgId = pgCategoryBySlug.get(cat.slug);
    if (pgId) mongoCatIdToPgId.set(cat._id.toString(), pgId);
  });

  // Build Mongo tag id -> Postgres tag id map, matched by slug (creating Postgres tags as needed)
  const mongoTags = await MongoTag.find().lean();
  const mongoTagIdToPgId = new Map();
  for (const tag of mongoTags) {
    const existing = await query('select id from tags where slug = $1', [tag.slug]);
    let pgId = existing.rows[0]?.id;
    if (!pgId) {
      const { rows } = await query(
        `insert into tags (name, slug, description, color, is_active) values ($1,$2,$3,$4,$5) returning id`,
        [tag.name, tag.slug, tag.description || '', tag.color || null, tag.isActive !== false]
      );
      pgId = rows[0].id;
    }
    mongoTagIdToPgId.set(tag._id.toString(), pgId);
  }

  // Wipe products/junction tables so this script is safely re-runnable
  await query('delete from product_categories');
  await query('delete from product_tags');
  await query('delete from products');

  let migrated = 0;
  for (const p of products) {
    const categoryIds = (p.categories || [])
      .map((id) => mongoCatIdToPgId.get(id.toString()))
      .filter(Boolean);
    const primaryCategoryId = p.primaryCategory
      ? mongoCatIdToPgId.get(p.primaryCategory.toString())
      : categoryIds[0];
    const categoryId = p.category
      ? mongoCatIdToPgId.get(p.category.toString())
      : primaryCategoryId;
    const tagIds = (p.tags || [])
      .map((id) => mongoTagIdToPgId.get(id.toString()))
      .filter(Boolean);

    const row = await productModel.insertProduct({
      title: p.title,
      name: p.name || p.title,
      slug: p.slug,
      description: p.description || '',
      brand: p.brand,
      vendor: p.vendor,
      shortDescription: p.shortDescription,
      sku: p.sku,
      barcode: p.barcode,
      price: p.price,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      discount: p.discount,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      stockStatus: p.stockStatus,
      allowBackorder: p.allowBackorder,
      lowStockThreshold: p.lowStockThreshold,
      primaryCategoryId: primaryCategoryId || null,
      categoryId: categoryId || null,
      pictureSecureUrl: p.picture?.secure_url,
      picturePublicId: p.picture?.public_id,
      status: p.status,
      visibility: p.visibility,
      isFeatured: p.isFeatured,
      isBestseller: p.isBestseller,
      isOnSale: p.isOnSale,
      saleStartDate: p.saleStartDate,
      saleEndDate: p.saleEndDate,
      images: p.images || [],
      attributes: p.attributes || [],
      variationAttributes: p.variationAttributes || [],
      variations: p.variations || [],
      seo: p.seo || {},
      customFields: p.customFields || {},
      flags: p.flags || [],
      minPurchaseQuantity: p.minPurchaseQuantity,
      maxPurchaseQuantity: p.maxPurchaseQuantity,
      createdByUser: p.user?.toString(),
      publishedAt: p.publishedAt,
    });

    // Preserve original timestamps and computed fields not covered by insertProduct
    await query(
      `update products set created_at = $1, updated_at = $2, rating_average = $3, rating_count = $4, total_sales = $5
       where id = $6`,
      [p.createdAt, p.updatedAt, p.ratingAverage || 0, p.ratingCount || 0, p.totalSales || 0, row.id]
    );

    await productModel.setProductCategories(row.id, categoryIds);
    await productModel.setProductTags(row.id, tagIds);

    migrated += 1;
    console.log(`Migrated "${p.title}" (${p._id} -> ${row.id})`);
  }

  console.log(`\nMigration complete: ${migrated} products copied to Postgres`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
