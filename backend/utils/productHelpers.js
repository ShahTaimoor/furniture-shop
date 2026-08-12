const mongoose = require('mongoose');
const slugify = require('slugify');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseJSONField = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

const ensureArray = (value) => {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const normalizeObjectIdArray = (value) => {
  return ensureArray(value)
    .map((item) => {
      if (typeof item === 'string' && item.trim() === '') return null;
      if (mongoose.Types.ObjectId.isValid(item)) return item;
      return null;
    })
    .filter(Boolean);
};

const normalizeStringArray = (value) => {
  return ensureArray(value)
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item.value) return String(item.value).trim();
      if (typeof item === 'object' && item.name) return String(item.name).trim();
      return null;
    })
    .filter(Boolean);
};

const syncPrimaryProductImage = (images, primaryPicture) => {
  if (!Array.isArray(images) || images.length === 0) {
    return images || [];
  }

  const targetPublicId = primaryPicture?.public_id;
  const targetUrl = primaryPicture?.secure_url;
  let primaryAssigned = false;

  return images.map((image, index) => {
    if (!image) return image;

    const matchesPublicId = targetPublicId && image.public_id === targetPublicId;
    const matchesUrl = !matchesPublicId && targetUrl && image.secure_url === targetUrl;
    const shouldBePrimary =
      matchesPublicId ||
      matchesUrl ||
      (!targetPublicId && !targetUrl && !primaryAssigned && index === 0);

    if (shouldBePrimary) {
      image.isPrimary = true;
      primaryAssigned = true;
    } else {
      image.isPrimary = false;
    }

    if (typeof image.position !== 'number') {
      image.position = index;
    }

    return image;
  });
};

const resolveCategoryIdentifier = async (identifier) => {
  if (!identifier) return null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Category.findById(identifier);
    if (byId) return byId;
  }

  const normalized = identifier.toString().trim().toLowerCase();
  if (!normalized) return null;

  const bySlug = await Category.findOne({ slug: normalized });
  if (bySlug) return bySlug;

  return Category.findOne({ name: { $regex: `^${normalized}$`, $options: 'i' } });
};

const getDescendantCategoryIds = async (categoryDoc) => {
  if (!categoryDoc) return [];

  const categories = await Category.find({
    $or: [
      { _id: categoryDoc._id },
      { 'ancestors._id': categoryDoc._id },
    ],
  })
    .select('_id')
    .lean();

  return categories.map((category) => category._id);
};

const resolveCategoryIdentifiers = async (input) => {
  const identifiers = ensureArray(parseJSONField(input, input)).filter(Boolean);
  if (identifiers.length === 0) return [];

  const resolvedIds = new Set();

  for (const identifier of identifiers) {
    if (!identifier) continue;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      const category = await Category.findById(identifier).select('_id');
      if (category) {
        resolvedIds.add(category._id.toString());
        continue;
      }
    }

    if (typeof identifier === 'string') {
      const matchedCategory = await resolveCategoryIdentifier(identifier);
      if (matchedCategory) {
        resolvedIds.add(matchedCategory._id.toString());
      }
    }
  }

  return Array.from(resolvedIds).map((id) => new mongoose.Types.ObjectId(id));
};

const resolveTagIds = async (input, userId) => {
  const tags = normalizeStringArray(parseJSONField(input, input));
  if (!tags || tags.length === 0) return [];

  const resolvedIds = new Set();

  for (const rawTag of tags) {
    if (!rawTag) continue;

    if (mongoose.Types.ObjectId.isValid(rawTag)) {
      const existingTag = await Tag.findById(rawTag).select('_id');
      if (existingTag) {
        resolvedIds.add(existingTag._id.toString());
      }
      continue;
    }

    const slug = slugify(rawTag, { lower: true, strict: true });
    let tagDoc = await Tag.findOne({
      $or: [
        { slug },
        { name: { $regex: `^${rawTag}$`, $options: 'i' } }
      ]
    });

    if (!tagDoc) {
      tagDoc = await Tag.create({
        name: rawTag,
        slug,
        createdBy: userId,
        updatedBy: userId
      });
    }

    resolvedIds.add(tagDoc._id.toString());
  }

  return Array.from(resolvedIds).map((id) => new mongoose.Types.ObjectId(id));
};

const findTagIds = async (input) => {
  const tags = normalizeStringArray(parseJSONField(input, input));
  if (!tags || tags.length === 0) return [];

  const resolvedIds = new Set();

  for (const rawTag of tags) {
    if (!rawTag) continue;

    if (mongoose.Types.ObjectId.isValid(rawTag)) {
      const existingTag = await Tag.findById(rawTag).select('_id');
      if (existingTag) {
        resolvedIds.add(existingTag._id.toString());
      }
      continue;
    }

    const slug = slugify(rawTag, { lower: true, strict: true });
    const tagDoc = await Tag.findOne({
      $or: [
        { slug },
        { name: { $regex: `^${rawTag}$`, $options: 'i' } }
      ]
    }).select('_id');

    if (tagDoc) {
      resolvedIds.add(tagDoc._id.toString());
    }
  }

  return Array.from(resolvedIds).map((id) => new mongoose.Types.ObjectId(id));
};

const normalizeAttributes = (input) => {
  const attributes = parseJSONField(input, input);
  if (!attributes) return [];

  return ensureArray(attributes)
    .map((attr) => {
      if (!attr) return null;
      if (typeof attr === 'object') {
        const name = attr.name || attr.key || attr.attributeName;
        const value = attr.value || attr.attributeValue;
        if (!name || !value) return null;
        return {
          name: String(name).trim(),
          value: String(value).trim(),
        };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeVariations = (input) => {
  const variations = parseJSONField(input, input);
  if (!variations) return [];

  return ensureArray(variations)
    .map((variation, index) => {
      if (!variation || typeof variation !== 'object') {
        return null;
      }

      const normalizedAttributes = normalizeAttributes(variation.attributes || variation.options || []);

      const normalizedImages = ensureArray(variation.images).map((image, imageIndex) => {
        if (!image) return null;

        if (image.secure_url || image.public_id) {
          return {
            secure_url: image.secure_url || null,
            public_id: image.public_id || null,
            alt: image.alt || '',
            isPrimary: image.isPrimary || imageIndex === 0,
            position: typeof image.position === 'number' ? image.position : imageIndex,
          };
        }

        return null;
      }).filter(Boolean);

      const price = Number(variation.price ?? variation.salePrice ?? variation.basePrice ?? 0);
      const compareAtPrice = variation.compareAtPrice !== undefined
        ? Number(variation.compareAtPrice)
        : variation.originalPrice !== undefined
          ? Number(variation.originalPrice)
          : undefined;
      const stock = Number(variation.stock ?? variation.inventory ?? 0);

      return {
        sku: variation.sku ? String(variation.sku).trim() : undefined,
        name: variation.name || variation.title || `Variation ${index + 1}`,
        description: variation.description || '',
        price: Number.isFinite(price) ? price : 0,
        compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : undefined,
        stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
        allowBackorder: Boolean(variation.allowBackorder),
        status: ['active', 'inactive'].includes(variation.status) ? variation.status : 'active',
        isDefault: Boolean(variation.isDefault),
        attributes: normalizedAttributes,
        images: normalizedImages,
        metadata: {
          weight: variation.weight ? Number(variation.weight) : undefined,
          width: variation.width ? Number(variation.width) : undefined,
          height: variation.height ? Number(variation.height) : undefined,
          depth: variation.depth ? Number(variation.depth) : undefined,
        },
      };
    })
    .filter(Boolean);
};

const findProductByIdentifier = async (identifier) => {
  if (!identifier) return null;

  const query = isValidObjectId(identifier)
    ? { _id: identifier }
    : { slug: identifier.toLowerCase() };

  return Product.findOne({
    ...query,
    isDeleted: false
  });
};

const buildProductResponse = (product) => {
  if (!product) return null;
  const productObj = product.toObject ? product.toObject() : product;

  const primaryImage = product.primaryImage || productObj.picture?.secure_url || productObj.images?.find?.((img) => img.isPrimary)?.secure_url;
  productObj.primaryImage = primaryImage || null;
  productObj.image = productObj.primaryImage;

  if (Array.isArray(productObj.images)) {
    productObj.images = productObj.images.map((image, index) => ({
      ...image,
      isPrimary: image.isPrimary || (primaryImage ? image.secure_url === primaryImage : index === 0),
    }));
  }

  if (Array.isArray(productObj.variations)) {
    productObj.variations = productObj.variations.map((variation) => ({
      ...variation,
      images: Array.isArray(variation.images)
        ? variation.images.map((image, index) => ({
            ...image,
            isPrimary: image.isPrimary || index === 0,
          }))
        : [],
    }));
  }

  if (Array.isArray(productObj.tags)) {
    productObj.tags = productObj.tags.map((tag) => {
      if (!tag) return tag;
      return tag.toObject ? tag.toObject() : tag;
    });
  }

  if (Array.isArray(productObj.categories)) {
    productObj.categories = productObj.categories.map((category) => {
      if (!category) return category;
      const categoryObj = category.toObject ? category.toObject() : category;
      categoryObj.image = categoryObj.picture?.secure_url || null;
      return categoryObj;
    });
  }

  if (typeof product.totalInventory === 'number') {
    productObj.totalInventory = product.totalInventory;
  } else if (Array.isArray(productObj.variations) && productObj.variations.length > 0) {
    productObj.totalInventory = productObj.variations.reduce((acc, variation) => acc + (variation.stock || 0), 0);
  } else {
    productObj.totalInventory = productObj.stock ?? 0;
  }

  if (productObj.category) {
    const categoryObj = productObj.category.toObject
      ? productObj.category.toObject()
      : productObj.category;
    categoryObj.image = categoryObj.picture?.secure_url || null;
    productObj.category = categoryObj;
  }
  productObj.costPrice = Number.isFinite(productObj.costPrice) ? productObj.costPrice : 0;
  productObj.salePrice = Number.isFinite(productObj.salePrice) ? productObj.salePrice : Number.isFinite(productObj.price) ? productObj.price : 0;
  productObj.discount = Number.isFinite(productObj.discount) ? productObj.discount : 0;
  return productObj;
};

module.exports = {
  isValidObjectId,
  parseJSONField,
  ensureArray,
  normalizeObjectIdArray,
  normalizeStringArray,
  syncPrimaryProductImage,
  resolveCategoryIdentifier,
  getDescendantCategoryIds,
  resolveCategoryIdentifiers,
  resolveTagIds,
  findTagIds,
  normalizeAttributes,
  normalizeVariations,
  findProductByIdentifier,
  buildProductResponse,
};
