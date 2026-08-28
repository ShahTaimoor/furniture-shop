const crypto = require('crypto');
const productModel = require('../models/postgres/productModel');
const categoryModel = require('../models/postgres/categoryModel');
const tagModel = require('../models/postgres/tagModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../utils/cloudinary');
const {
  parseJSONField,
  ensureArray,
  normalizeStringArray,
  syncPrimaryProductImage,
  normalizeAttributes,
  normalizeVariations,
} = require('../utils/productHelpers');

// Postgres stores variations as plain JSONB, so (unlike Mongo subdocuments) they need
// an explicit stable id assigned for cart/wishlist variant references to work.
const withVariationIds = (variations) =>
  variations.map((variation) => ({ id: variation.id || crypto.randomUUID(), ...variation }));

// Uploads every file to Cloudinary concurrently instead of one-at-a-time, which was the
// main cause of slow multi-image uploads. Position/primary ordering is computed up front
// so parallel completion order doesn't affect the final image order.
const uploadImagesConcurrently = async (tasks, trimmedTitle) => {
  const results = await Promise.all(
    tasks.map(async ({ file, options }) => {
      const { secure_url, public_id, bytes, format, width, height } = await uploadImageOnCloudinary(file.buffer, 'products', {
        mimeType: file.mimetype,
      });
      if (!secure_url || !public_id) throw new Error('Cloudinary upload failed');
      return {
        secure_url, public_id,
        alt: options.alt || trimmedTitle,
        isPrimary: Boolean(options.isPrimary),
        position: options.position,
        metadata: { width, height, size: bytes, format },
      };
    })
  );
  return results.sort((a, b) => a.position - b.position);
};

// @route POST /api/pg/create-product
const createProduct = async (req, res) => {
  try {
    const {
      title, name, description, shortDescription, price, costPrice, compareAtPrice,
      sku, barcode, stock, allowBackorder, lowStockThreshold, status = 'active',
      visibility = 'public', isFeatured, isBestseller, isOnSale, salePrice,
      saleStartDate, saleEndDate, discount, categories, category: legacyCategory,
      primaryCategory, tags, attributes, variationAttributes, variations, seo,
      customFields, minPurchaseQuantity, maxPurchaseQuantity, flags,
    } = req.body;

    if (!title && !name) {
      return res.status(400).json({ success: false, message: 'Product title or name is required' });
    }

    const numericSalePrice =
      salePrice !== undefined && salePrice !== null && salePrice !== ''
        ? Number(salePrice)
        : price !== undefined && price !== null && price !== ''
          ? Number(price)
          : NaN;
    if (!Number.isFinite(numericSalePrice) || numericSalePrice < 0) {
      return res.status(400).json({ success: false, message: 'A valid sale price is required' });
    }

    const numericCostPrice = costPrice !== undefined && costPrice !== null && costPrice !== '' ? Number(costPrice) : 0;
    if (!Number.isFinite(numericCostPrice) || numericCostPrice < 0) {
      return res.status(400).json({ success: false, message: 'Cost price must be a non-negative number' });
    }

    const primaryImageFile = req.files?.picture?.[0];
    const galleryFiles = req.files?.images || [];
    if (!primaryImageFile && galleryFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product image is required' });
    }

    const trimmedTitle = (title || name || '').trim();

    const uploadTasks = [];
    if (primaryImageFile) uploadTasks.push({ file: primaryImageFile, options: { isPrimary: true, position: 0 } });
    galleryFiles.forEach((file, i) => {
      uploadTasks.push({ file, options: { position: (primaryImageFile ? 1 : 0) + i } });
    });

    const uploadedImages = await uploadImagesConcurrently(uploadTasks, trimmedTitle);
    const uploadedPrimary = uploadedImages.find((img) => img.isPrimary);
    let primaryImage = uploadedPrimary
      ? { secure_url: uploadedPrimary.secure_url, public_id: uploadedPrimary.public_id }
      : null;

    const existingImagesInput = parseJSONField(req.body.existingImages, []);
    ensureArray(existingImagesInput).forEach((image, index) => {
      if (image && (image.secure_url || image.public_id)) {
        const normalizedImage = {
          secure_url: image.secure_url, public_id: image.public_id,
          alt: image.alt || trimmedTitle,
          isPrimary: Boolean(image.isPrimary),
          position: typeof image.position === 'number' ? image.position : uploadedImages.length + index,
          metadata: image.metadata || {},
        };
        uploadedImages.push(normalizedImage);
        if (normalizedImage.isPrimary && !primaryImage) {
          primaryImage = { secure_url: normalizedImage.secure_url, public_id: normalizedImage.public_id };
        }
      }
    });

    if (!primaryImage && uploadedImages.length > 0) {
      primaryImage = { secure_url: uploadedImages[0].secure_url, public_id: uploadedImages[0].public_id };
      uploadedImages[0].isPrimary = true;
    }

    const categoriesInput = categories ?? legacyCategory;
    const categoryIds = await productModel.resolveCategoryIds(
      categoriesInput ? ensureArray(parseJSONField(categoriesInput, categoriesInput)) : []
    );
    const primaryCategoryId = primaryCategory || categoryIds[0] || null;

    const tagIds = await productModel.resolveTagIds(ensureArray(parseJSONField(tags, tags)), req.user?._id?.toString());
    const normalizedAttributes = normalizeAttributes(attributes);
    const normalizedVariationAttributes = normalizeStringArray(variationAttributes);
    const normalizedVariations = withVariationIds(normalizeVariations(variations));

    const normalizedStock = normalizedVariations.length > 0
      ? normalizedVariations.reduce((acc, v) => acc + (v.stock || 0), 0)
      : Number(stock ?? 0);

    let normalizedDiscount;
    const discountNumeric = discount !== undefined && discount !== null && discount !== '' ? Number(discount) : undefined;
    if (Number.isFinite(discountNumeric) && discountNumeric >= 0) {
      normalizedDiscount = Math.min(discountNumeric, 100);
    } else if (numericSalePrice > 0) {
      const computed = ((numericSalePrice - numericCostPrice) / numericSalePrice) * 100;
      normalizedDiscount = Number.isFinite(computed) && computed > 0 ? Math.min(100, Math.max(0, computed)) : 0;
    } else {
      normalizedDiscount = 0;
    }

    const saleStart = saleStartDate ? new Date(saleStartDate) : null;
    const saleEnd = saleEndDate ? new Date(saleEndDate) : null;
    if (saleStart && saleEnd && saleEnd < saleStart) {
      return res.status(400).json({ success: false, message: 'Sale end date cannot be earlier than sale start date' });
    }

    let stockStatus = 'in-stock';
    const lowStockNumeric = lowStockThreshold !== undefined ? Number(lowStockThreshold) : 0;
    const allowBackorderBool = allowBackorder === 'true' || allowBackorder === true;
    if (normalizedStock <= 0 && !allowBackorderBool) {
      stockStatus = 'out-of-stock';
    } else if (normalizedStock > 0 && normalizedStock <= lowStockNumeric) {
      stockStatus = 'backorder';
    }

    const slug = await productModel.generateUniqueSlug(trimmedTitle);

    const row = await productModel.insertProduct({
      title: trimmedTitle,
      name: name || trimmedTitle,
      slug,
      description: description || '',
      shortDescription,
      price: numericSalePrice,
      costPrice: numericCostPrice,
      salePrice: numericSalePrice,
      discount: normalizedDiscount,
      compareAtPrice: compareAtPrice !== undefined ? Number(compareAtPrice) : undefined,
      sku: sku ? sku.toString().trim().toUpperCase() : undefined,
      barcode: barcode ? barcode.toString().trim() : undefined,
      stock: normalizedStock,
      stockStatus,
      allowBackorder: allowBackorderBool,
      lowStockThreshold: Number.isFinite(lowStockNumeric) ? lowStockNumeric : 0,
      primaryCategoryId,
      categoryId: primaryCategoryId,
      pictureSecureUrl: primaryImage?.secure_url,
      picturePublicId: primaryImage?.public_id,
      status: ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active',
      visibility: ['public', 'private', 'hidden'].includes(visibility) ? visibility : 'public',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isBestseller: isBestseller === 'true' || isBestseller === true,
      isOnSale: isOnSale === 'true' || isOnSale === true || normalizedDiscount > 0,
      saleStartDate: saleStart,
      saleEndDate: saleEnd,
      images: uploadedImages,
      attributes: normalizedAttributes,
      variationAttributes: normalizedVariationAttributes,
      variations: normalizedVariations,
      seo: typeof seo === 'string' ? parseJSONField(seo, {}) : seo,
      customFields: typeof customFields === 'string' ? parseJSONField(customFields, {}) : customFields,
      flags: normalizeStringArray(flags),
      minPurchaseQuantity: minPurchaseQuantity !== undefined ? Number(minPurchaseQuantity) : 1,
      maxPurchaseQuantity: maxPurchaseQuantity !== undefined ? Number(maxPurchaseQuantity) : undefined,
      createdByUser: req.user?._id?.toString(),
      publishedAt: status === 'active' ? new Date() : undefined,
    });

    await productModel.setProductCategories(row.id, categoryIds);
    await productModel.setProductTags(row.id, tagIds);

    const [hydrated] = await productModel.hydrateRows([row]);

    return res.status(201).json({ success: true, message: 'Product created successfully', product: hydrated });
  } catch (error) {
    console.error('pg createProduct error:', error);
    return res.status(500).json({ success: false, message: 'Server error in create product', error: error.message });
  }
};

// @route PUT /api/pg/update-product/:id
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await productModel.findRawById(id);
    if (!existing || existing.is_deleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      title, name, description, shortDescription, price, costPrice, compareAtPrice,
      sku, barcode, stock, allowBackorder, lowStockThreshold, status, visibility,
      isFeatured, isBestseller, isOnSale, salePrice, saleStartDate, saleEndDate,
      discount, categories, category: legacyCategory, primaryCategory, tags,
      attributes, variationAttributes, variations, seo, customFields,
      minPurchaseQuantity, maxPurchaseQuantity, flags, imagesToRemove,
    } = req.body;

    const trimmedTitle = (title || name || existing.title || existing.name || '').trim();
    const updates = {};

    if (title) {
      updates.title = trimmedTitle;
      updates.slug = await productModel.generateUniqueSlug(trimmedTitle, id);
    }
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (shortDescription !== undefined) updates.shortDescription = shortDescription;

    const salePriceProvided = salePrice !== undefined && salePrice !== null && salePrice !== '';
    const priceProvided = price !== undefined && price !== null && price !== '';
    const costPriceProvided = costPrice !== undefined && costPrice !== null && costPrice !== '';

    if (salePriceProvided || priceProvided) {
      const numericSalePrice = salePriceProvided ? Number(salePrice) : Number(price);
      if (!Number.isFinite(numericSalePrice) || numericSalePrice < 0) {
        return res.status(400).json({ success: false, message: 'A valid sale price is required' });
      }
      updates.salePrice = numericSalePrice;
      updates.price = numericSalePrice;
    }

    if (costPriceProvided) {
      const numericCostPrice = Number(costPrice);
      if (!Number.isFinite(numericCostPrice) || numericCostPrice < 0) {
        return res.status(400).json({ success: false, message: 'Cost price must be a non-negative number' });
      }
      updates.costPrice = numericCostPrice;
    }

    if (compareAtPrice !== undefined) {
      const numericCompare = Number(compareAtPrice);
      updates.compareAtPrice = Number.isFinite(numericCompare) ? numericCompare : null;
    }
    if (sku !== undefined) updates.sku = sku ? sku.toString().trim().toUpperCase() : null;
    if (barcode !== undefined) updates.barcode = barcode ? barcode.toString().trim() : null;
    if (allowBackorder !== undefined) updates.allowBackorder = allowBackorder === 'true' || allowBackorder === true;
    if (lowStockThreshold !== undefined) {
      const n = Number(lowStockThreshold);
      updates.lowStockThreshold = Number.isFinite(n) && n >= 0 ? n : existing.low_stock_threshold;
    }

    // Images
    const primaryImageFile = req.files?.picture?.[0];
    const galleryFiles = req.files?.images || [];
    let currentImages = existing.images || [];

    const imagesToRemoveList = normalizeStringArray(parseJSONField(imagesToRemove, imagesToRemove));
    if (imagesToRemoveList.length > 0) {
      const toDelete = currentImages.filter((img) => img.public_id && imagesToRemoveList.includes(img.public_id));
      await Promise.all(toDelete.map((img) => deleteImageOnCloudinary(img.public_id)));
      currentImages = currentImages.filter((img) => !imagesToRemoveList.includes(img.public_id));
    }

    let picture = existing.picture_secure_url
      ? { secure_url: existing.picture_secure_url, public_id: existing.picture_public_id }
      : null;
    if (picture?.public_id && imagesToRemoveList.includes(picture.public_id)) {
      await deleteImageOnCloudinary(picture.public_id);
      picture = null;
    }

    const updateUploadTasks = [];
    if (primaryImageFile) updateUploadTasks.push({ file: primaryImageFile, options: { isPrimary: true, position: 0 } });
    galleryFiles.forEach((file, i) => {
      updateUploadTasks.push({ file, options: { position: currentImages.length + (primaryImageFile ? 1 : 0) + i } });
    });

    const newImages = await uploadImagesConcurrently(updateUploadTasks, trimmedTitle);

    if (newImages.length > 0) {
      currentImages = [...currentImages, ...newImages];
      const newPrimary = newImages.find((img) => img.isPrimary);
      if (newPrimary) {
        if (picture?.public_id) await deleteImageOnCloudinary(picture.public_id);
        picture = { secure_url: newPrimary.secure_url, public_id: newPrimary.public_id };
      } else if (!picture && currentImages.length > 0) {
        picture = { secure_url: currentImages[0].secure_url, public_id: currentImages[0].public_id };
      }
    }

    const existingImagesInput = parseJSONField(req.body.existingImages, []);
    if (Array.isArray(existingImagesInput) && existingImagesInput.length > 0) {
      const normalized = existingImagesInput
        .map((img, index) => (img && (img.secure_url || img.public_id) ? {
          secure_url: img.secure_url, public_id: img.public_id,
          alt: img.alt || trimmedTitle,
          isPrimary: Boolean(img.isPrimary),
          position: typeof img.position === 'number' ? img.position : index,
          metadata: img.metadata || {},
        } : null))
        .filter(Boolean);
      if (normalized.length > 0) {
        currentImages = normalized;
        const primary = normalized.find((img) => img.isPrimary);
        if (primary) picture = { secure_url: primary.secure_url, public_id: primary.public_id };
      }
    }

    if (!picture && currentImages.length > 0) {
      picture = { secure_url: currentImages[0].secure_url, public_id: currentImages[0].public_id };
      currentImages[0].isPrimary = true;
    }
    if (currentImages.length > 0) {
      currentImages = syncPrimaryProductImage(currentImages, picture);
    }

    updates.images = currentImages;
    updates.pictureSecureUrl = picture?.secure_url || null;
    updates.picturePublicId = picture?.public_id || null;

    let categoryIds;
    if (categories !== undefined) {
      categoryIds = await productModel.resolveCategoryIds(ensureArray(parseJSONField(categories, categories)));
      if (categoryIds.length > 0) {
        updates.categoryId = categoryIds[0];
        updates.primaryCategoryId = categoryIds[0];
      }
    } else if (legacyCategory !== undefined) {
      categoryIds = await productModel.resolveCategoryIds(ensureArray(parseJSONField(legacyCategory, legacyCategory)));
      if (categoryIds.length > 0) {
        updates.categoryId = categoryIds[0];
        updates.primaryCategoryId = categoryIds[0];
      }
    }
    if (primaryCategory !== undefined) {
      updates.primaryCategoryId = primaryCategory || null;
      updates.categoryId = primaryCategory || updates.categoryId;
    }

    let tagIds;
    if (tags !== undefined) {
      tagIds = await productModel.resolveTagIds(ensureArray(parseJSONField(tags, tags)), req.user?._id?.toString());
    }

    if (attributes !== undefined) updates.attributes = normalizeAttributes(attributes);
    if (variationAttributes !== undefined) updates.variationAttributes = normalizeStringArray(variationAttributes);
    if (variations !== undefined) updates.variations = withVariationIds(normalizeVariations(variations));
    if (flags !== undefined) updates.flags = normalizeStringArray(flags);
    if (seo !== undefined) updates.seo = typeof seo === 'string' ? parseJSONField(seo, {}) : seo || {};
    if (customFields !== undefined) {
      updates.customFields = {
        ...(existing.custom_fields || {}),
        ...(typeof customFields === 'string' ? parseJSONField(customFields, {}) : customFields),
      };
    }
    if (minPurchaseQuantity !== undefined) {
      const n = Number(minPurchaseQuantity);
      updates.minPurchaseQuantity = Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (maxPurchaseQuantity !== undefined) {
      const n = Number(maxPurchaseQuantity);
      updates.maxPurchaseQuantity = Number.isFinite(n) && n > 0 ? n : undefined;
    }

    const effectiveVariations = updates.variations !== undefined ? updates.variations : existing.variations;
    if (stock !== undefined && (!effectiveVariations || effectiveVariations.length === 0)) {
      const n = Number(stock);
      updates.stock = Number.isFinite(n) && n >= 0 ? n : existing.stock;
    }
    if (effectiveVariations && effectiveVariations.length > 0) {
      updates.stock = effectiveVariations.reduce((acc, v) => acc + (v.stock || 0), 0);
    }

    if (status !== undefined && ['active', 'inactive', 'draft', 'archived'].includes(status)) {
      updates.status = status;
      if (status === 'active' && !existing.published_at) updates.publishedAt = new Date();
    }
    if (visibility !== undefined && ['public', 'private', 'hidden'].includes(visibility)) {
      updates.visibility = visibility;
    }
    if (isFeatured !== undefined) updates.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isBestseller !== undefined) updates.isBestseller = isBestseller === 'true' || isBestseller === true;

    const effectiveSalePrice = updates.salePrice !== undefined ? updates.salePrice : Number(existing.sale_price);
    const effectiveCostPrice = updates.costPrice !== undefined ? updates.costPrice : Number(existing.cost_price);

    if (discount !== undefined && discount !== null && discount !== '') {
      const n = Number(discount);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: 'Discount must be a non-negative number' });
      }
      updates.discount = Math.min(n, 100);
    } else if ((salePriceProvided || priceProvided || costPriceProvided) && Number.isFinite(effectiveSalePrice) && effectiveSalePrice > 0) {
      const computed = ((effectiveSalePrice - (Number.isFinite(effectiveCostPrice) ? effectiveCostPrice : 0)) / effectiveSalePrice) * 100;
      updates.discount = Number.isFinite(computed) && computed > 0 ? Math.min(100, Math.max(0, computed)) : 0;
    }

    if (isOnSale !== undefined) {
      updates.isOnSale = isOnSale === 'true' || isOnSale === true;
    } else {
      const effectiveDiscount = updates.discount !== undefined ? updates.discount : Number(existing.discount);
      updates.isOnSale = (Number.isFinite(effectiveDiscount) ? effectiveDiscount : 0) > 0;
    }

    if (saleStartDate !== undefined) updates.saleStartDate = saleStartDate ? new Date(saleStartDate) : null;
    if (saleEndDate !== undefined) updates.saleEndDate = saleEndDate ? new Date(saleEndDate) : null;

    const effectiveSaleStart = updates.saleStartDate !== undefined ? updates.saleStartDate : existing.sale_start_date;
    const effectiveSaleEnd = updates.saleEndDate !== undefined ? updates.saleEndDate : existing.sale_end_date;
    if (effectiveSaleStart && effectiveSaleEnd && new Date(effectiveSaleEnd) < new Date(effectiveSaleStart)) {
      return res.status(400).json({ success: false, message: 'Sale end date cannot be earlier than sale start date' });
    }

    const updatedRow = await productModel.updateProductById(id, updates);

    if (categoryIds !== undefined) await productModel.setProductCategories(id, categoryIds);
    if (tagIds !== undefined) await productModel.setProductTags(id, tagIds);

    const [hydrated] = await productModel.hydrateRows([updatedRow]);

    return res.status(200).json({ success: true, message: 'Product updated successfully', product: hydrated });
  } catch (error) {
    console.error('pg updateProduct error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating product', error: error.message });
  }
};

// @route PUT /api/pg/update-product-stock/:id
const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    if (stock === undefined || stock === null) {
      return res.status(400).json({ success: false, message: 'Stock value is required' });
    }
    const existing = await productModel.findRawById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const updatedRow = await productModel.updateProductById(id, { stock: parseInt(stock, 10) });
    const [hydrated] = await productModel.hydrateRows([updatedRow]);
    return res.status(200).json({ success: true, message: 'Product stock updated successfully', product: hydrated });
  } catch (error) {
    console.error('pg updateProductStock error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating product stock' });
  }
};

// @route DELETE /api/pg/delete-product/:id
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    const existing = await productModel.findRawById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (permanent === 'true') {
      if (existing.picture_public_id) await deleteImageOnCloudinary(existing.picture_public_id);
      const uniqueIds = Array.from(new Set((existing.images || []).map((i) => i.public_id).filter(Boolean)));
      await Promise.all(uniqueIds.map((pid) => deleteImageOnCloudinary(pid)));
      await productModel.hardDeleteById(id);
      return res.status(200).json({ success: true, message: 'Product permanently deleted successfully', data: { _id: id } });
    }

    if (existing.is_deleted) {
      return res.status(400).json({ success: false, message: 'Product is already archived' });
    }

    const updatedRow = await productModel.softDeleteById(id, req.user?._id?.toString());
    const [hydrated] = await productModel.hydrateRows([updatedRow]);
    return res.status(200).json({ success: true, message: 'Product archived successfully', data: hydrated });
  } catch (error) {
    console.error('pg deleteProduct error:', error);
    res.status(500).json({ success: false, message: 'Server error in delete Product', error: error.message });
  }
};

// @route PATCH /api/pg/restore-product/:id
const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'inactive' } = req.body;

    const existing = await productModel.findRawById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (!existing.is_deleted) {
      return res.status(400).json({ success: false, message: 'Product is not archived' });
    }

    const nextStatus = ['active', 'inactive', 'draft'].includes(status) ? status : 'inactive';
    const updatedRow = await productModel.restoreById(id, nextStatus);
    if (nextStatus === 'active' && !existing.published_at) {
      await productModel.updateProductById(id, { publishedAt: new Date() });
    }
    const [hydrated] = await productModel.hydrateRows([updatedRow]);
    return res.status(200).json({ success: true, message: 'Product restored successfully', product: hydrated });
  } catch (error) {
    console.error('pg restoreProduct error:', error);
    res.status(500).json({ success: false, message: 'Server error while restoring product', error: error.message });
  }
};

// @route GET /api/pg/new-arrivals
const getNewArrivals = async (req, res) => {
  try {
    const limitNum = parseInt(req.query.limit, 10) || 12;
    const { products, total } = await productModel.listNewArrivals(limitNum);
    return res.status(200).json({ success: true, message: 'New arrivals fetched successfully', data: products, total });
  } catch (error) {
    console.error('pg getNewArrivals error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching new arrivals' });
  }
};

// @route GET /api/pg/get-products
const getProducts = async (req, res) => {
  try {
    let {
      category, search, page = 1, limit = 24, stockFilter = 'all', sortBy = 'az',
      productIds, tags: tagsFilter, minPrice, maxPrice, status: statusFilter,
      featured, bestseller, onSale, visibility,
    } = req.query;

    limit = limit === 'all' ? 0 : parseInt(limit, 10) || 24;
    page = parseInt(page, 10) || 1;
    if (page < 1) page = 1;
    if (limit < 0) limit = 24;

    let productIdList;
    if (productIds && productIds.trim()) {
      productIdList = productIds.split(',').map((s) => s.trim()).filter(Boolean);
    }

    let tagIds;
    if (tagsFilter !== undefined) {
      const names = tagsFilter.split(',').map((s) => s.trim()).filter(Boolean);
      const resolved = [];
      for (const name of names) {
        const tag = await tagModel.findByNameOrSlug(name, name);
        if (tag) resolved.push(tag._id);
      }
      tagIds = resolved;
      if (tagIds.length === 0 && names.length > 0) {
        return res.status(200).json({
          success: true, message: 'No products found for the selected tags.',
          data: [], pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }
    }

    let categoryId;
    if (category && category.trim().toLowerCase() !== 'all') {
      
      const trimmed = category.trim();
      let matched = null;
      if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
        matched = await categoryModel.findById(trimmed);
      }
      if (!matched) {
        const all = await categoryModel.findAll();
        matched = all.find((c) => c.slug === trimmed || c.name.toLowerCase() === trimmed.toLowerCase());
      }
      if (!matched) {
        return res.status(200).json({
          success: true, message: 'No products found in this category.',
          data: [], pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }
      categoryId = matched._id;
    }

    const minPriceValue = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    const maxPriceValue = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;

    const { products, total } = await productModel.listProducts({
      category: categoryId,
      search,
      page,
      limit,
      stockFilter,
      sortBy,
      productIds: productIdList,
      tagIds,
      minPrice: Number.isFinite(minPriceValue) ? minPriceValue : undefined,
      maxPrice: Number.isFinite(maxPriceValue) ? maxPriceValue : undefined,
      statusFilter,
      featured: featured === 'true',
      bestseller: bestseller === 'true',
      onSale: onSale === 'true',
      visibility,
    });

    const message = products.length === 0
      ? (search ? 'No products found for your search.' : 'No products found in this category.')
      : 'Products fetched successfully';

    return res.status(200).json({
      success: true,
      message,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (error) {
    console.error('pg getProducts error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching products' });
  }
};

// @route GET /api/pg/single-product/slug/:slug
const getProductBySlug = async (req, res) => {
  try {
    const normalizedSlug = req.params.slug?.toString().trim().toLowerCase();
    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Product slug is required' });
    }
    const row = await productModel.findRawBySlug(normalizedSlug);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const [hydrated] = await productModel.hydrateRows([row]);
    return res.status(200).json({ success: true, message: 'Product fetched successfully', product: hydrated });
  } catch (error) {
    console.error('pg getProductBySlug error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching product' });
  }
};

// @route GET /api/pg/single-product/:id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await productModel.findRawById(id);
    if (!row || row.is_deleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const [hydrated] = await productModel.hydrateRows([row]);
    return res.status(200).json({ success: true, message: 'Product fetched successfully', product: hydrated });
  } catch (error) {
    console.error('pg getProductById error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching product' });
  }
};

// @route GET /api/pg/search-suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(200).json({ success: true, message: 'Search suggestions fetched successfully', data: [] });
    }
    const searchLimit = Math.min(parseInt(limit, 10) || 10, 20);
    const data = await productModel.searchSuggestions(q.trim(), searchLimit);
    return res.status(200).json({ success: true, message: 'Search suggestions fetched successfully', data, count: data.length });
  } catch (error) {
    console.error('pg getSearchSuggestions error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching search suggestions', error: error.message });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  restoreProduct,
  getNewArrivals,
  getProducts,
  getProductBySlug,
  getProductById,
  getSearchSuggestions,
};
