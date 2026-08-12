const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../utils/cloudinary');
const { CacheService } = require('../services/redisService');
const {
  parseJSONField,
  ensureArray,
  normalizeStringArray,
  syncPrimaryProductImage,
  resolveCategoryIdentifier,
  getDescendantCategoryIds,
  resolveCategoryIdentifiers,
  resolveTagIds,
  findTagIds,
  normalizeAttributes,
  normalizeVariations,
  buildProductResponse,
} = require('../utils/productHelpers');

// @route POST /api/create-product
// @desc Create a new Product
// @access Private/Admin
const createProduct = async (req, res) => {
  try {
    const {
      title,
      name,
      description,
      shortDescription,
      price,
      costPrice,
      compareAtPrice,
      sku,
      barcode,
      stock,
      allowBackorder,
      lowStockThreshold,
      status = 'active',
      visibility = 'public',
      isFeatured,
      isBestseller,
      isOnSale,
      salePrice,
      saleStartDate,
      saleEndDate,
      discount,
      categories,
      category: legacyCategory,
      primaryCategory,
      tags,
      attributes,
      variationAttributes,
      variations,
      seo,
      customFields,
      minPurchaseQuantity,
      maxPurchaseQuantity,
      flags,
    } = req.body;

    if (!title && !name) {
      return res.status(400).json({
        success: false,
        message: 'Product title or name is required',
      });
    }

    const numericSalePrice =
      salePrice !== undefined && salePrice !== null && salePrice !== ''
        ? Number(salePrice)
        : price !== undefined && price !== null && price !== ''
          ? Number(price)
          : NaN;
    if (!Number.isFinite(numericSalePrice) || numericSalePrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid sale price is required',
      });
    }

    const numericCostPrice =
      costPrice !== undefined && costPrice !== null && costPrice !== ''
        ? Number(costPrice)
        : 0;
    if (!Number.isFinite(numericCostPrice) || numericCostPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Cost price must be a non-negative number',
      });
    }

    const primaryImageFile = req.files?.picture?.[0];
    const galleryFiles = req.files?.images || [];

    if (!primaryImageFile && galleryFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required',
      });
    }

    const trimmedTitle = (title || name || '').trim();
    const existingProduct = await Product.findOne({
      $or: [
        { title: { $regex: `^${trimmedTitle}$`, $options: 'i' } },
        { name: { $regex: `^${trimmedTitle}$`, $options: 'i' } },
        sku ? { sku: sku.toString().trim().toUpperCase() } : null,
      ].filter(Boolean),
      isDeleted: false,
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name or SKU already exists',
      });
    }

    const uploadedImages = [];
    let primaryImage = null;

    const uploadAndPushImage = async (file, options = {}) => {
      const { secure_url, public_id, bytes, format, width, height } = await uploadImageOnCloudinary(file.buffer, 'products', {
        mimeType: file.mimetype,
      });

      if (!secure_url || !public_id) {
        throw new Error('Cloudinary upload failed');
      }

      const imagePayload = {
        secure_url,
        public_id,
        alt: options.alt || trimmedTitle,
        isPrimary: Boolean(options.isPrimary),
        position: typeof options.position === 'number' ? options.position : uploadedImages.length,
        metadata: {
          width,
          height,
          size: bytes,
          format,
        },
      };

      uploadedImages.push(imagePayload);
      if (imagePayload.isPrimary || !primaryImage) {
        primaryImage = {
          secure_url,
          public_id,
        };
      }
    };

    if (primaryImageFile) {
      await uploadAndPushImage(primaryImageFile, { isPrimary: true, position: 0 });
    }

    for (let i = 0; i < galleryFiles.length; i += 1) {
      const file = galleryFiles[i];
      await uploadAndPushImage(file, { position: uploadedImages.length });
    }

    const existingImagesInput = parseJSONField(req.body.existingImages, []);
    ensureArray(existingImagesInput).forEach((image, index) => {
      if (image && (image.secure_url || image.public_id)) {
        const normalizedImage = {
          secure_url: image.secure_url,
          public_id: image.public_id,
          alt: image.alt || trimmedTitle,
          isPrimary: Boolean(image.isPrimary),
          position: typeof image.position === 'number' ? image.position : uploadedImages.length + index,
          metadata: image.metadata || {},
        };
        uploadedImages.push(normalizedImage);
        if (normalizedImage.isPrimary && !primaryImage) {
          primaryImage = {
            secure_url: normalizedImage.secure_url,
            public_id: normalizedImage.public_id,
          };
        }
      }
    });

    if (!primaryImage && uploadedImages.length > 0) {
      primaryImage = {
        secure_url: uploadedImages[0].secure_url,
        public_id: uploadedImages[0].public_id,
      };
      uploadedImages[0].isPrimary = true;
    }

    const categoryIds = await resolveCategoryIdentifiers(categories ?? legacyCategory);
    const primaryCategoryId = primaryCategory && mongoose.Types.ObjectId.isValid(primaryCategory)
      ? primaryCategory
      : categoryIds[0];

    const tagIds = await resolveTagIds(tags, req.user?._id);
    const normalizedAttributes = normalizeAttributes(attributes);
    const normalizedVariationAttributes = normalizeStringArray(variationAttributes);
    const normalizedVariations = normalizeVariations(variations);

    const normalizedStock = normalizedVariations.length > 0
      ? normalizedVariations.reduce((acc, variation) => acc + (variation.stock || 0), 0)
      : Number(stock ?? 0);

    const comparePriceNumeric = compareAtPrice !== undefined ? Number(compareAtPrice) : undefined;
    const lowStockNumeric = lowStockThreshold !== undefined ? Number(lowStockThreshold) : 0;
    const minQtyNumeric = minPurchaseQuantity !== undefined ? Number(minPurchaseQuantity) : undefined;
    const maxQtyNumeric = maxPurchaseQuantity !== undefined ? Number(maxPurchaseQuantity) : undefined;
    const discountNumeric =
      discount !== undefined && discount !== null && discount !== ''
        ? Number(discount)
        : undefined;

    let normalizedDiscount;
    if (Number.isFinite(discountNumeric) && discountNumeric >= 0) {
      normalizedDiscount = Math.min(discountNumeric, 100);
    } else if (numericSalePrice > 0) {
      const computedDiscount = ((numericSalePrice - numericCostPrice) / numericSalePrice) * 100;
      if (Number.isFinite(computedDiscount) && computedDiscount > 0) {
        normalizedDiscount = Math.min(100, Math.max(0, computedDiscount));
      } else {
        normalizedDiscount = 0;
      }
    } else {
      normalizedDiscount = 0;
    }

    const saleStart = saleStartDate ? new Date(saleStartDate) : undefined;
    const saleEnd = saleEndDate ? new Date(saleEndDate) : undefined;

    if (saleStart && saleEnd && saleEnd < saleStart) {
      return res.status(400).json({
        success: false,
        message: 'Sale end date cannot be earlier than sale start date',
      });
    }

    const productPayload = {
      title: trimmedTitle,
      name: name || trimmedTitle,
      description: description || '',
      shortDescription,
      price: numericSalePrice,
      costPrice: numericCostPrice,
      salePrice: numericSalePrice,
      compareAtPrice: Number.isFinite(comparePriceNumeric) ? comparePriceNumeric : undefined,
      discount: normalizedDiscount,
      sku: sku ? sku.toString().trim().toUpperCase() : undefined,
      barcode: barcode ? barcode.toString().trim() : undefined,
      stock: Number.isFinite(normalizedStock) && normalizedStock >= 0 ? normalizedStock : 0,
      allowBackorder: allowBackorder === 'true' || allowBackorder === true,
      lowStockThreshold: Number.isFinite(lowStockNumeric) && lowStockNumeric >= 0 ? lowStockNumeric : 0,
      categories: categoryIds,
      primaryCategory: primaryCategoryId || undefined,
      category: primaryCategoryId || categoryIds[0] || undefined,
      tags: tagIds,
      images: uploadedImages,
      picture: primaryImage,
      status: ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active',
      visibility: ['public', 'private', 'hidden'].includes(visibility) ? visibility : 'public',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isBestseller: isBestseller === 'true' || isBestseller === true,
      isOnSale: isOnSale === 'true' || isOnSale === true || normalizedDiscount > 0,
      saleStartDate: saleStart,
      saleEndDate: saleEnd,
      variationAttributes: normalizedVariationAttributes,
      variations: normalizedVariations,
      attributes: normalizedAttributes,
      seo: typeof seo === 'string' ? parseJSONField(seo, {}) : seo,
      customFields: typeof customFields === 'string' ? parseJSONField(customFields, {}) : customFields,
      minPurchaseQuantity: Number.isFinite(minQtyNumeric) && minQtyNumeric > 0 ? minQtyNumeric : undefined,
      maxPurchaseQuantity: Number.isFinite(maxQtyNumeric) && maxQtyNumeric > 0 ? maxQtyNumeric : undefined,
      flags: normalizeStringArray(flags),
      user: req.user._id,
      publishedAt: status === 'active' ? new Date() : undefined,
    };

    const product = await Product.create(productPayload);

    await CacheService.invalidate('products:*');
    await CacheService.invalidate('product:*');
    await CacheService.del('products:list:*');

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: buildProductResponse(product),
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in create product',
      error: error.message,
    });
  }
};

// @route POST /api/import-excel
// @desc Import products from Excel file
// @access Private/Admin
const importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    });

    if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
      const headers = jsonData[0];

      const headerMap = {};
      headers.forEach((header, index) => {
        if (header) {
          const cleanHeader = header.toString().toLowerCase().trim();
          if (cleanHeader.includes('name') || cleanHeader === 'name') {
            headerMap[index] = 'name';
          } else if (cleanHeader.includes('cost') && cleanHeader.includes('price')) {
            headerMap[index] = 'costPrice';
          } else if (cleanHeader.includes('sale') && cleanHeader.includes('price')) {
            headerMap[index] = 'salePrice';
          } else if (cleanHeader.includes('discount')) {
            headerMap[index] = 'discount';
          } else if (cleanHeader.includes('stock') || cleanHeader === 'stock') {
            headerMap[index] = 'stock';
          } else if (cleanHeader.includes('price') || cleanHeader === 'price') {
            headerMap[index] = 'price';
          }
        }
      });

      if (Object.keys(headerMap).length === 0) {
        for (let i = 0; i < Math.min(3, jsonData.length); i++) {
          const row = jsonData[i];
          for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (cell && typeof cell === 'string') {
              const cleanCell = cell.toLowerCase().trim();
              if (cleanCell.includes('steering') || cleanCell.includes('lock') || cleanCell.includes('product')) {
                if (!headerMap[j]) headerMap[j] = 'name';
              } else if (!isNaN(parseFloat(cell)) && parseFloat(cell) > 1000) {
                if (!headerMap[j]) headerMap[j] = 'stock';
              } else if (!isNaN(parseFloat(cell)) && parseFloat(cell) < 10000) {
                if (!headerMap[j]) headerMap[j] = 'price';
              }
            }
          }
        }
      }

      jsonData = jsonData.slice(1).map(row => {
        const obj = {};
        Object.keys(headerMap).forEach(index => {
          obj[headerMap[index]] = row[index];
        });
        return obj;
      });
    } else {
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    }

    if (jsonData.length === 0 || (jsonData[0] && Object.keys(jsonData[0]).length === 0)) {
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: '',
        blankrows: false
      });

      if (jsonData.length > 0 && jsonData[0].__EMPTY) {
        jsonData = jsonData.map(row => {
          const obj = {};
          if (row.__EMPTY) obj.name = row.__EMPTY;
          if (row.__EMPTY_1) obj.stock = row.__EMPTY_1;
          if (row.__EMPTY_2) obj.costPrice = row.__EMPTY_2;
          if (row.__EMPTY_3) obj.salePrice = row.__EMPTY_3;
          if (row.__EMPTY_4) obj.discount = row.__EMPTY_4;
          if (!obj.salePrice && row.__EMPTY_2) obj.salePrice = row.__EMPTY_2;
          if (!obj.costPrice && row.__EMPTY_3) obj.costPrice = row.__EMPTY_3;
          if (row.__EMPTY_2 && !obj.price) obj.price = row.__EMPTY_2;
          if (row.__EMPTY_3 && !obj.price) obj.price = row.__EMPTY_3;
          return obj;
        });
      }
    }

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or invalid format'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      try {
        let name = row.name ?? row.__EMPTY;
        let stock = row.stock ?? row.__EMPTY_1;
        let costPriceValue = row.costPrice ?? row.__EMPTY_2 ?? row.price;
        let salePriceValue = row.salePrice ?? row.__EMPTY_3 ?? row.price;
        let discountValue = row.discount ?? row.__EMPTY_4;

        const normalizedHeader = (value) =>
          typeof value === 'string' ? value.trim().toLowerCase() : '';

        if (
          ['name', ''].includes(normalizedHeader(name)) &&
          ['stock', ''].includes(normalizedHeader(stock)) &&
          ['price', 'costprice', 'saleprice', ''].includes(normalizedHeader(costPriceValue))
        ) {
          continue;
        }

        if (!name && !stock && !costPriceValue && !salePriceValue) {
          continue;
        }

        const productName = name ? name.toString().trim() : `Product ${rowNumber}`;
        const cleanStock = stock ? stock.toString().replace(/,/g, '') : '0';
        const cleanCost = costPriceValue ? costPriceValue.toString().replace(/,/g, '') : '';
        const cleanSale = salePriceValue ? salePriceValue.toString().replace(/,/g, '') : '';
        const cleanDiscount = discountValue ? discountValue.toString().replace(/,/g, '') : '';

        const productStock = parseInt(cleanStock, 10) || 0;
        const costPriceNumeric =
          cleanCost !== '' ? parseFloat(cleanCost) || 0 : cleanSale !== '' ? parseFloat(cleanSale) || 0 : 0;
        const salePriceNumeric =
          cleanSale !== ''
            ? parseFloat(cleanSale) || 0
            : cleanCost !== ''
              ? parseFloat(cleanCost) || 0
              : 0;
        const discountNumeric = cleanDiscount !== '' ? Math.max(0, Math.min(parseFloat(cleanDiscount) || 0, 100)) : 0;

        let categoryId;

        const existingCategory = await Category.findOne({
          name: 'General'
        });

        if (existingCategory) {
          categoryId = existingCategory._id;
        } else {
          const newCategory = await Category.create({
            name: 'General',
            slug: 'general',
            picture: {
              secure_url: '/logos.png',
              public_id: 'default-category-image'
            }
          });
          categoryId = newCategory._id;
        }

        const defaultImage = {
          secure_url: '/logos.png',
          public_id: 'default-product-image',
          alt: productName,
          isPrimary: true,
          position: 0
        };

        await Product.create({
          title: productName,
          name: productName,
          description: `Imported from Excel - Row ${rowNumber}`,
          price: salePriceNumeric || costPriceNumeric,
          costPrice: costPriceNumeric,
          salePrice: salePriceNumeric || costPriceNumeric,
          discount: discountNumeric,
          sku: `IMP-${Date.now()}-${rowNumber}`,
          category: categoryId,
          categories: categoryId ? [categoryId] : [],
          stock: productStock,
          user: req.user._id,
          status: 'active',
          visibility: 'public',
          picture: defaultImage,
          images: [defaultImage],
          publishedAt: new Date()
        });

        results.success++;
      } catch (error) {
        console.error(`Error creating product for row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import completed. ${results.success} products created, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    console.error('Error importing Excel file:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while importing Excel file',
      error: error.message
    });
  }
};

// @route PUT /api/update-product/:id
// @desc Update an existing product
// @access Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product id',
      });
    }

    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      title,
      name,
      description,
      shortDescription,
      price,
      costPrice,
      compareAtPrice,
      sku,
      barcode,
      stock,
      allowBackorder,
      lowStockThreshold,
      status,
      visibility,
      isFeatured,
      isBestseller,
      isOnSale,
      salePrice,
      saleStartDate,
      saleEndDate,
      discount,
      categories,
      category: legacyCategory,
      primaryCategory,
      tags,
      attributes,
      variationAttributes,
      variations,
      seo,
      customFields,
      minPurchaseQuantity,
      maxPurchaseQuantity,
      flags,
      imagesToRemove,
    } = req.body;

    const trimmedTitle = (title || name || product.title || product.name || '').trim();

    if (title || name) {
      const duplicateProduct = await Product.findOne({
        _id: { $ne: product._id },
        isDeleted: false,
        $or: [
          title ? { title: { $regex: `^${trimmedTitle}$`, $options: 'i' } } : null,
          name ? { name: { $regex: `^${trimmedTitle}$`, $options: 'i' } } : null,
          sku ? { sku: sku.toString().trim().toUpperCase() } : null,
        ].filter(Boolean),
      });

      if (duplicateProduct) {
        return res.status(400).json({
          success: false,
          message: 'Another product with this name or SKU already exists',
        });
      }
    }

    const salePriceProvided = salePrice !== undefined && salePrice !== null && salePrice !== '';
    const priceProvided = price !== undefined && price !== null && price !== '';
    const costPriceProvided = costPrice !== undefined && costPrice !== null && costPrice !== '';
    if (salePriceProvided || priceProvided) {
      const numericSalePrice = salePriceProvided ? Number(salePrice) : Number(price);
      if (!Number.isFinite(numericSalePrice) || numericSalePrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'A valid sale price is required',
        });
      }
      product.salePrice = numericSalePrice;
      product.price = numericSalePrice;
    }

    if (costPriceProvided) {
      const numericCostPrice = Number(costPrice);
      if (!Number.isFinite(numericCostPrice) || numericCostPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cost price must be a non-negative number',
        });
      }
      product.costPrice = numericCostPrice;
    }

    const primaryImageFile = req.files?.picture?.[0];
    const galleryFiles = req.files?.images || [];

    const imagesToRemoveList = normalizeStringArray(parseJSONField(imagesToRemove, imagesToRemove));
    if (imagesToRemoveList.length > 0) {
      const imagesToDelete = product.images.filter(
        (image) => image.public_id && imagesToRemoveList.includes(image.public_id)
      );

      await Promise.all(
        imagesToDelete.map((image) => deleteImageOnCloudinary(image.public_id))
      );

      product.images = product.images.filter(
        (image) => !imagesToRemoveList.includes(image.public_id)
      );

      if (product.picture && product.picture.public_id && imagesToRemoveList.includes(product.picture.public_id)) {
        await deleteImageOnCloudinary(product.picture.public_id);
        product.picture = undefined;
      }
    }

    const uploadedImages = [];
    const uploadAndPushImage = async (file, options = {}) => {
      const { secure_url, public_id, bytes, format, width, height } = await uploadImageOnCloudinary(file.buffer, 'products', {
        mimeType: file.mimetype,
      });
      if (!secure_url || !public_id) {
        throw new Error('Cloudinary upload failed');
      }
      const imagePayload = {
        secure_url,
        public_id,
        alt: options.alt || trimmedTitle || product.title,
        isPrimary: Boolean(options.isPrimary),
        position: typeof options.position === 'number' ? options.position : product.images.length + uploadedImages.length,
        metadata: {
          width,
          height,
          size: bytes,
          format,
        },
      };
      uploadedImages.push(imagePayload);
    };

    if (primaryImageFile) {
      await uploadAndPushImage(primaryImageFile, { isPrimary: true, position: 0 });
    }

    for (let i = 0; i < galleryFiles.length; i += 1) {
      const file = galleryFiles[i];
      await uploadAndPushImage(file, { position: product.images.length + uploadedImages.length });
    }

    if (uploadedImages.length > 0) {
      product.images = [...product.images, ...uploadedImages];
      const primaryImage = uploadedImages.find((image) => image.isPrimary);
      if (primaryImage) {
        if (product.picture && product.picture.public_id) {
          await deleteImageOnCloudinary(product.picture.public_id);
        }
        product.picture = {
          secure_url: primaryImage.secure_url,
          public_id: primaryImage.public_id,
        };
      } else if (!product.picture && product.images.length > 0) {
        const firstImage = product.images[0];
        product.picture = {
          secure_url: firstImage.secure_url,
          public_id: firstImage.public_id,
        };
      }
    }

    const existingImagesInput = parseJSONField(req.body.existingImages, []);
    if (existingImagesInput && Array.isArray(existingImagesInput) && existingImagesInput.length > 0) {
      const normalizedExistingImages = existingImagesInput
        .map((image, index) => {
          if (!image || (!image.secure_url && !image.public_id)) {
            return null;
          }
          return {
            secure_url: image.secure_url,
            public_id: image.public_id,
            alt: image.alt || trimmedTitle || product.title,
            isPrimary: Boolean(image.isPrimary),
            position: typeof image.position === 'number' ? image.position : index,
            metadata: image.metadata || {},
          };
        })
        .filter(Boolean);

      if (normalizedExistingImages.length > 0) {
        product.images = normalizedExistingImages;
        const primaryImage = normalizedExistingImages.find((image) => image.isPrimary);
        if (primaryImage) {
          product.picture = {
            secure_url: primaryImage.secure_url,
            public_id: primaryImage.public_id,
          };
        }
      }
    }

    if (!product.picture && product.images.length > 0) {
      const firstImage = product.images[0];
      product.picture = {
        secure_url: firstImage.secure_url,
        public_id: firstImage.public_id,
      };
      product.images[0].isPrimary = true;
    }

    if (product.images && product.images.length > 0) {
      product.images = syncPrimaryProductImage(product.images, product.picture);
    }

    if (title) product.title = trimmedTitle;
    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (compareAtPrice !== undefined) {
      const numericCompare = Number(compareAtPrice);
      product.compareAtPrice = Number.isFinite(numericCompare) ? numericCompare : undefined;
    }
    if (sku !== undefined) product.sku = sku ? sku.toString().trim().toUpperCase() : undefined;
    if (barcode !== undefined) product.barcode = barcode ? barcode.toString().trim() : undefined;
    if (allowBackorder !== undefined) {
      product.allowBackorder = allowBackorder === 'true' || allowBackorder === true;
    }
    if (lowStockThreshold !== undefined) {
      const numericLowStock = Number(lowStockThreshold);
      product.lowStockThreshold = Number.isFinite(numericLowStock) && numericLowStock >= 0 ? numericLowStock : product.lowStockThreshold;
    }

    if (categories !== undefined) {
      const categoryIds = await resolveCategoryIdentifiers(categories);
      product.categories = categoryIds;
      if (categoryIds.length > 0) {
        product.category = categoryIds[0];
      }
    }

    if (legacyCategory !== undefined && categories === undefined) {
      const categoryIds = await resolveCategoryIdentifiers(legacyCategory);
      if (categoryIds.length > 0) {
        product.categories = categoryIds;
        product.category = categoryIds[0];
      }
    }

    if (primaryCategory !== undefined) {
      if (mongoose.Types.ObjectId.isValid(primaryCategory)) {
        product.primaryCategory = primaryCategory;
        product.category = primaryCategory;
      } else if (!primaryCategory) {
        product.primaryCategory = undefined;
      }
    }

    if (tags !== undefined) {
      const tagIds = await resolveTagIds(tags, req.user?._id);
      product.tags = tagIds;
    }

    if (attributes !== undefined) {
      product.attributes = normalizeAttributes(attributes);
    }

    if (variationAttributes !== undefined) {
      product.variationAttributes = normalizeStringArray(variationAttributes);
    }

    if (variations !== undefined) {
      product.variations = normalizeVariations(variations);
    }

    if (flags !== undefined) {
      product.flags = normalizeStringArray(flags);
    }

    if (seo !== undefined) {
      product.seo = typeof seo === 'string' ? parseJSONField(seo, {}) : seo || {};
    }

    if (customFields !== undefined) {
      const parsedCustomFields = typeof customFields === 'string' ? parseJSONField(customFields, {}) : customFields;
      if (parsedCustomFields) {
        Object.keys(parsedCustomFields).forEach((key) => {
          product.customFields.set(key, parsedCustomFields[key]);
        });
      }
    }

    if (minPurchaseQuantity !== undefined) {
      const minQtyNumeric = Number(minPurchaseQuantity);
      product.minPurchaseQuantity = Number.isFinite(minQtyNumeric) && minQtyNumeric > 0 ? minQtyNumeric : undefined;
    }

    if (maxPurchaseQuantity !== undefined) {
      const maxQtyNumeric = Number(maxPurchaseQuantity);
      product.maxPurchaseQuantity = Number.isFinite(maxQtyNumeric) && maxQtyNumeric > 0 ? maxQtyNumeric : undefined;
    }

    if (stock !== undefined && (!product.variations || product.variations.length === 0)) {
      const numericStock = Number(stock);
      product.stock = Number.isFinite(numericStock) && numericStock >= 0 ? numericStock : product.stock;
    }

    if (product.variations && product.variations.length > 0) {
      product.stock = product.variations.reduce((acc, variation) => acc + (variation.stock || 0), 0);
    }

    if (status !== undefined && ['active', 'inactive', 'draft', 'archived'].includes(status)) {
      product.status = status;
      if (status === 'active' && !product.publishedAt) {
        product.publishedAt = new Date();
      }
    }

    if (visibility !== undefined && ['public', 'private', 'hidden'].includes(visibility)) {
      product.visibility = visibility;
    }

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    if (isBestseller !== undefined) {
      product.isBestseller = isBestseller === 'true' || isBestseller === true;
    }

    if (discount !== undefined && discount !== null && discount !== '') {
      const numericDiscount = Number(discount);
      if (!Number.isFinite(numericDiscount) || numericDiscount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be a non-negative number',
        });
      }
      product.discount = Math.min(numericDiscount, 100);
    } else if ((salePriceProvided || priceProvided || costPriceProvided) && Number.isFinite(product.salePrice) && product.salePrice > 0) {
      const computed = ((product.salePrice - (Number.isFinite(product.costPrice) ? product.costPrice : 0)) / product.salePrice) * 100;
      if (Number.isFinite(computed) && computed > 0) {
        product.discount = Math.min(100, Math.max(0, computed));
      } else {
        product.discount = 0;
      }
    }

    if (isOnSale !== undefined) {
      product.isOnSale = isOnSale === 'true' || isOnSale === true;
    } else {
      product.isOnSale = (Number.isFinite(product.discount) ? product.discount : 0) > 0;
    }

    if (saleStartDate !== undefined) {
      product.saleStartDate = saleStartDate ? new Date(saleStartDate) : undefined;
    }

    if (saleEndDate !== undefined) {
      product.saleEndDate = saleEndDate ? new Date(saleEndDate) : undefined;
    }

    if (product.saleStartDate && product.saleEndDate && product.saleEndDate < product.saleStartDate) {
      return res.status(400).json({
        success: false,
        message: 'Sale end date cannot be earlier than sale start date',
      });
    }

    await product.save();

    await CacheService.invalidate('products:*');
    await CacheService.invalidate(`product:${id}:*`);
    await CacheService.invalidate(`product:slug:${product.slug}:*`);
    await CacheService.del('products:list:*');

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: buildProductResponse(product),
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating product', error: error.message });
  }
};

// @route PUT /api/update-product-stock/:id
// @desc Update product stock status
// @access Private/Admin
const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return res.status(400).json({
        success: false,
        message: 'Stock value is required'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.stock = parseInt(stock);
    await product.save();

    await CacheService.invalidate(`product:${id}:*`);
    await CacheService.invalidate(`product:slug:${product.slug}:*`);
    await CacheService.del('products:list:*');

    return res.status(200).json({
      success: true,
      message: 'Product stock updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating product stock'
    });
  }
};

// @route DELETE /api/delete-product/:id
// @desc Delete a product by ID
// @access Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (permanent === 'true') {
      if (product.picture && product.picture.public_id) {
        await deleteImageOnCloudinary(product.picture.public_id);
      }
      if (Array.isArray(product.images)) {
        const uniquePublicIds = Array.from(
          new Set(
            product.images
              .map((image) => image?.public_id)
              .filter(Boolean)
          )
        );
        await Promise.all(uniquePublicIds.map((publicId) => deleteImageOnCloudinary(publicId)));
      }

      await Product.deleteOne({ _id: id });

      await CacheService.invalidate('products:*');
      await CacheService.invalidate(`product:${id}:*`);
      await CacheService.del('products:list:*');

      return res.status(200).json({
        success: true,
        message: 'Product permanently deleted successfully',
        data: { _id: id },
      });
    }

    if (product.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Product is already archived',
      });
    }

    product.isDeleted = true;
    product.status = 'archived';
    product.deletedAt = new Date();
    product.deletedBy = req.user?._id;

    await product.save();

    await CacheService.invalidate('products:*');
    await CacheService.invalidate(`product:${id}:*`);
    await CacheService.del('products:list:*');

    return res.status(200).json({
      success: true,
      message: 'Product archived successfully',
      data: buildProductResponse(product),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error in delete Product', error: error.message });
  }
};

// @route PATCH /api/restore-product/:id
// @desc Restore an archived product
// @access Private/Admin
const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'inactive' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (!product.isDeleted) {
      return res.status(400).json({ success: false, message: 'Product is not archived' });
    }

    product.isDeleted = false;
    product.deletedAt = undefined;
    product.deletedBy = undefined;
    if (['active', 'inactive', 'draft'].includes(status)) {
      product.status = status;
    } else {
      product.status = 'inactive';
    }
    if (product.status === 'active' && !product.publishedAt) {
      product.publishedAt = new Date();
    }

    await product.save();

    await CacheService.invalidate('products:*');
    await CacheService.invalidate(`product:${id}:*`);
    await CacheService.del('products:list:*');

    return res.status(200).json({
      success: true,
      message: 'Product restored successfully',
      product: buildProductResponse(product),
    });
  } catch (error) {
    console.error('Error restoring product:', error);
    res.status(500).json({ success: false, message: 'Server error while restoring product', error: error.message });
  }
};

// @route GET /api/new-arrivals
// @desc Get new arrival products (recently added)
// @access Public
const getNewArrivals = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const limitNum = parseInt(limit) || 12;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = {
      isDeleted: false,
      status: 'active',
      visibility: 'public',
      stock: { $gt: 0 },
      $or: [
        { createdAt: { $gte: thirtyDaysAgo } },
        { isFeatured: true }
      ]
    };

    const products = await Product.find(query)
      .select('title name slug picture images price salePrice costPrice discount compareAtPrice description stock stockStatus isOnSale isFeatured isBestseller saleEndDate totalSales sku attributes variationAttributes variations ratingAverage ratingCount createdAt categories tags user')
      .populate('user', 'name')
      .populate('category', 'name slug isActive parent ancestors position')
      .populate('categories', 'name slug isActive parent ancestors position picture')
      .populate('tags', 'name slug color isActive')
      .sort({ createdAt: -1 })
      .limit(limitNum);

    const total = await Product.countDocuments(query);
    const newProductArray = products.map((product) => buildProductResponse(product));

    return res.status(200).json({
      success: true,
      message: 'New arrivals fetched successfully',
      data: newProductArray,
      total,
    });
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching new arrivals',
    });
  }
};

// @route GET /api/get-products
// @desc Get all products with optional query filters
// @access Public
const getProducts = async (req, res) => {
  try {
    let {
      category,
      search,
      page = 1,
      limit = 24,
      stockFilter = 'all',
      sortBy = 'az',
      productIds,
      tags: tagsFilter,
      minPrice,
      maxPrice,
      status: statusFilter,
      featured,
      bestseller,
      onSale,
      attributes: attributesFilter,
      variations: variationsFilter,
      visibility,
    } = req.query;

    const cacheKey = `products:list:${JSON.stringify({
      category,
      search,
      page,
      limit,
      stockFilter,
      sortBy,
      productIds,
      tagsFilter,
      minPrice,
      maxPrice,
      statusFilter,
      featured,
      bestseller,
      onSale,
      attributesFilter,
      variationsFilter,
      visibility,
    })}`;

    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    if (limit === 'all') {
      limit = 0;
    } else {
      limit = parseInt(limit);
    }
    page = parseInt(page);

    if (page < 1) page = 1;
    if (limit < 0) limit = 24;

    const query = { isDeleted: false };

    if (stockFilter !== 'out-of-stock') {
      query.stock = { $gt: 0 };
    }

    switch (stockFilter) {
      case 'active':
        query.stockStatus = { $in: ['in-stock', 'backorder', 'preorder'] };
        break;
      case 'out-of-stock':
        query.stockStatus = 'out-of-stock';
        break;
      case 'backorder':
        query.stockStatus = 'backorder';
        break;
      case 'preorder':
        query.stockStatus = 'preorder';
        break;
      default:
        break;
    }

    if (statusFilter && ['active', 'inactive', 'draft', 'archived'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    if (visibility && ['public', 'private', 'hidden'].includes(visibility)) {
      query.visibility = visibility;
    }

    if (productIds && productIds.trim()) {
      const ids = productIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length > 0) {
          query._id = { $in: validIds };
        }
      }
    }

    const priceConditions = [];
    const minPriceValue = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    const maxPriceValue = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;

    if ((minPriceValue !== undefined && Number.isFinite(minPriceValue)) || (maxPriceValue !== undefined && Number.isFinite(maxPriceValue))) {
      const baseRange = {};
      if (minPriceValue !== undefined && Number.isFinite(minPriceValue)) {
        baseRange.$gte = minPriceValue;
      }
      if (maxPriceValue !== undefined && Number.isFinite(maxPriceValue)) {
        baseRange.$lte = maxPriceValue;
      }

      if (Object.keys(baseRange).length > 0) {
        priceConditions.push({ price: { ...baseRange } });
        priceConditions.push({
          $and: [
            { isOnSale: true },
            { salePrice: { ...baseRange } }
          ]
        });
        priceConditions.push({ variations: { $elemMatch: { price: { ...baseRange } } } });
      }
    }

    if (priceConditions.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({ $or: priceConditions });
    }

    if (tagsFilter !== undefined) {
      const tagIds = await findTagIds(tagsFilter);
      if (tagIds.length === 0 && String(tagsFilter).trim().length > 0) {
        return res.status(200).json({
          success: true,
          message: 'No products found for the selected tags.',
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        });
      }
      if (tagIds.length > 0) {
        query.tags = { $in: tagIds };
      }
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (bestseller === 'true') {
      query.isBestseller = true;
    }

    if (onSale === 'true') {
      query.isOnSale = true;
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { saleEndDate: { $exists: false } },
          { saleEndDate: null },
          { saleEndDate: { $gte: new Date() } }
        ]
      });
    }

    if (category && category.trim().toLowerCase() !== 'all') {
      const trimmedCategory = category.trim();
      const matchedCategory = await resolveCategoryIdentifier(trimmedCategory);

      if (matchedCategory) {
        const categoryIds = await getDescendantCategoryIds(matchedCategory);
        const normalizedCategoryIds = (categoryIds.length > 0 ? categoryIds : [matchedCategory._id]).map((id) =>
          id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
        );

        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { category: { $in: normalizedCategoryIds } },
            { categories: { $in: normalizedCategoryIds } }
          ]
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'No products found in this category.',
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        });
      }
    }

    if (attributesFilter !== undefined) {
      const normalizedAttributeFilters = normalizeAttributes(attributesFilter);
      if (normalizedAttributeFilters.length > 0) {
        normalizedAttributeFilters.forEach((attribute) => {
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { attributes: { $elemMatch: { name: attribute.name, value: attribute.value } } },
              { 'variations.attributes': { $elemMatch: { name: attribute.name, value: attribute.value } } }
            ]
          });
        });
      }
    }

    if (variationsFilter !== undefined) {
      const normalizedVariationFilters = normalizeAttributes(variationsFilter);
      if (normalizedVariationFilters.length > 0) {
        normalizedVariationFilters.forEach((attribute) => {
          query.$and = query.$and || [];
          query.$and.push({
            'variations.attributes': {
              $elemMatch: { name: attribute.name, value: attribute.value }
            }
          });
        });
      }
    }

    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const makeRegex = (escaped, options = 'i') => ({ $regex: escaped, $options: options });

      const words = trimmedSearch.split(/\s+/).filter((word) => word.length > 0);
      const keywords = [];
      const years = [];

      words.forEach((word) => {
        if (/^\d{4}$/.test(word)) {
          years.push(word);
        } else {
          keywords.push(word);
        }
      });

      const searchOrConditions = [];
      const searchAndConditions = [];

      const escapedPhrase = escapeRegex(trimmedSearch.toLowerCase());
      searchOrConditions.push(
        { title: makeRegex(escapedPhrase) },
        { name: makeRegex(escapedPhrase) },
        { description: makeRegex(escapedPhrase) },
        { slug: makeRegex(escapedPhrase) },
        { sku: makeRegex(escapedPhrase) },
        { barcode: makeRegex(escapedPhrase) },
        { 'attributes.name': makeRegex(escapedPhrase) },
        { 'attributes.value': makeRegex(escapedPhrase) },
        { 'variations.name': makeRegex(escapedPhrase) },
        { 'variations.sku': makeRegex(escapedPhrase) },
        { 'variations.attributes.name': makeRegex(escapedPhrase) },
        { 'variations.attributes.value': makeRegex(escapedPhrase) }
      );

      const escapedExact = escapeRegex(trimmedSearch);
      searchOrConditions.push(
        { title: makeRegex(`^${escapedExact}$`) },
        { name: makeRegex(`^${escapedExact}$`) }
      );

      if (keywords.map((word) => word.toLowerCase()).some((word) => ['grill', 'grille'].includes(word))) {
        const excludeTerms = ['perfume', 'air freshener', 'fragrance', 'scent'];
        excludeTerms.forEach((term) => {
          const escapedTerm = escapeRegex(term);
          searchAndConditions.push({
            $and: [
              { title: { $not: { $regex: `\\b${escapedTerm}\\b`, $options: 'i' } } },
              { description: { $not: { $regex: `\\b${escapedTerm}\\b`, $options: 'i' } } }
            ]
          });
        });
      }

      if (keywords.length > 0) {
        keywords.forEach((keyword) => {
          const escapedKeyword = escapeRegex(keyword);
          searchAndConditions.push({
            $or: [
              { title: makeRegex(`\\b${escapedKeyword}\\b`) },
              { name: makeRegex(`\\b${escapedKeyword}\\b`) },
              { description: makeRegex(`\\b${escapedKeyword}\\b`) },
              { sku: makeRegex(escapedKeyword) },
              { 'variations.name': makeRegex(`\\b${escapedKeyword}\\b`) },
              { 'variations.sku': makeRegex(escapedKeyword) },
              { 'attributes.value': makeRegex(`\\b${escapedKeyword}\\b`) },
              { 'variations.attributes.value': makeRegex(`\\b${escapedKeyword}\\b`) }
            ]
          });
        });
      }

      if (years.length > 0) {
        years.forEach((year) => {
          const escapedYear = escapeRegex(year);
          searchAndConditions.push({
            $or: [
              { title: makeRegex(escapedYear) },
              { name: makeRegex(escapedYear) },
              { description: makeRegex(escapedYear) },
              { 'variations.name': makeRegex(escapedYear) }
            ]
          });
        });
      }

      if (searchOrConditions.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({ $or: searchOrConditions });
      }

      if (searchAndConditions.length > 0) {
        query.$and = query.$and || [];
        searchAndConditions.forEach((condition) => {
          query.$and.push(condition);
        });
      }
    }

    const totalProducts = await Product.countDocuments(query);

    let sortObject = {};
    switch (sortBy) {
      case 'az':
        sortObject = { title: 1 };
        break;
      case 'za':
        sortObject = { title: -1 };
        break;
      case 'price-low':
        sortObject = { price: 1 };
        break;
      case 'price-high':
        sortObject = { price: -1 };
        break;
      case 'newest':
        sortObject = { createdAt: -1 };
        break;
      case 'oldest':
        sortObject = { createdAt: 1 };
        break;
      case 'stock-high':
        sortObject = { stock: -1 };
        break;
      case 'stock-low':
        sortObject = { stock: 1 };
        break;
      case 'popularity':
      case 'bestsellers':
        sortObject = { totalSales: -1, ratingCount: -1, createdAt: -1 };
        break;
      case 'featured':
        sortObject = { isFeatured: -1, createdAt: -1 };
        break;
      case 'sale':
        sortObject = { isOnSale: -1, saleEndDate: 1, createdAt: -1 };
        break;
      case 'relevance':
        if (search && search.trim()) {
          sortObject = {
            title: 1,
            createdAt: -1
          };
        } else {
          sortObject = { createdAt: -1 };
        }
        break;
      default:
        if (search && search.trim()) {
          sortObject = {
            title: 1,
            createdAt: -1
          };
        } else {
          sortObject = { title: 1 };
        }
    }

    let products;
    if (search && search.trim()) {
      const searchWords = search.trim().toLowerCase().split(/\s+/);

      products = await Product.aggregate([
        { $match: query },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $cond: [
                    { $regexMatch: { input: { $toLower: "$title" }, regex: `^${search.trim().toLowerCase()}` } },
                    200, 0
                  ]
                },
                {
                  $cond: [
                    { $regexMatch: { input: { $toLower: "$title" }, regex: `^${searchWords[0]}\\b` } },
                    150, 0
                  ]
                },
                {
                  $cond: [
                    { $regexMatch: { input: { $toLower: "$title" }, regex: search.trim().toLowerCase() } },
                    100, 0
                  ]
                },
                {
                  $cond: [
                    {
                      $and: searchWords.map(word => ({
                        $regexMatch: { input: { $toLower: "$title" }, regex: `\\b${word}\\b` }
                      }))
                    },
                    80, 0
                  ]
                },
                {
                  $cond: [
                    {
                      $and: searchWords.map(word => ({
                        $regexMatch: { input: { $toLower: "$description" }, regex: `\\b${word}\\b` }
                      }))
                    },
                    60, 0
                  ]
                },
                {
                  $sum: searchWords.map(word => ({
                    $cond: [
                      { $regexMatch: { input: { $toLower: "$title" }, regex: `\\b${word}\\b` } },
                      20, 0
                    ]
                  }))
                },
                {
                  $sum: searchWords.map(word => ({
                    $cond: [
                      { $regexMatch: { input: { $toLower: "$description" }, regex: `\\b${word}\\b` } },
                      10, 0
                    ]
                  }))
                }
              ]
            }
          }
        },
        { $sort: { relevanceScore: -1, createdAt: -1 } },
        { $skip: limit === 0 ? 0 : (page - 1) * limit },
        { $limit: limit || 1000 },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'categories',
            let: { categoryId: '$category' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$categoryId'] },
                },
              },
              {
                $project: {
                  name: 1,
                  slug: 1,
                  isActive: 1,
                  parent: 1,
                  ancestors: 1,
                  position: 1,
                  picture: 1,
                },
              },
            ],
            as: 'category',
          }
        },
        {
          $lookup: {
            from: 'categories',
            let: { categoryIds: '$categories' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', { $ifNull: ['$$categoryIds', []] }]
                  }
                }
              },
              {
                $project: {
                  name: 1,
                  slug: 1,
                  isActive: 1,
                  parent: 1,
                  ancestors: 1,
                  position: 1,
                  picture: 1
                }
              }
            ],
            as: 'categories'
          }
        },
        {
          $lookup: {
            from: 'tags',
            let: { tagIds: '$tags' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', { $ifNull: ['$$tagIds', []] }]
                  }
                }
              },
              {
                $project: {
                  name: 1,
                  slug: 1,
                  color: 1,
                  isActive: 1
                }
              }
            ],
            as: 'tags'
          }
        },
        {
          $project: {
            title: 1,
            name: 1,
            picture: 1,
            images: 1,
            price: 1,
            salePrice: 1,
            costPrice: 1,
            discount: 1,
            compareAtPrice: 1,
            description: 1,
            stock: 1,
            stockStatus: 1,
            isFeatured: 1,
            isBestseller: 1,
            isOnSale: 1,
            saleEndDate: 1,
            totalSales: 1,
            slug: 1,
            sku: 1,
            attributes: 1,
            variations: 1,
            variationAttributes: 1,
            createdAt: 1,
            user: { $arrayElemAt: ['$user', 0] },
            category: { $arrayElemAt: ['$category', 0] },
            tags: 1,
            categories: 1,
            ratingAverage: 1,
            ratingCount: 1
          }
        }
      ]);
    } else {
      products = await Product.find(query)
        .select('title name slug picture images price salePrice costPrice discount compareAtPrice description stock stockStatus isOnSale isFeatured isBestseller saleEndDate totalSales sku attributes variationAttributes variations ratingAverage ratingCount createdAt categories tags user')
        .populate('user', 'name')
        .populate('category', 'name slug isActive parent ancestors position')
        .populate('categories', 'name slug isActive parent ancestors position picture')
        .populate('tags', 'name slug color isActive')
        .sort(sortObject)
        .skip(limit === 0 ? 0 : (page - 1) * limit)
        .limit(limit || undefined);
    }

    const newProductArray = products.map((product) => buildProductResponse(product));

    const message =
      products.length === 0
        ? search
          ? 'No products found for your search.'
          : 'No products found in this category.'
        : 'Products fetched successfully';

    const response = {
      success: true,
      message,
      data: newProductArray,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(totalProducts / limit) : 1,
      },
    };

    await CacheService.set(cacheKey, response, 3600);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error while fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
    });
  }
};

// @route GET /api/single-product/slug/:slug
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const normalizedSlug = slug?.toString().trim().toLowerCase();
    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        message: 'Product slug is required',
      });
    }

    const cacheKey = `product:slug:${normalizedSlug}`;
    const cachedProduct = await CacheService.get(cacheKey);
    if (cachedProduct) {
      return res.status(200).json(cachedProduct);
    }

    const product = await Product.findOne({ slug: normalizedSlug, isDeleted: false })
      .populate('category', 'name slug ancestors picture position isActive')
      .populate('categories', 'name slug ancestors picture position isActive')
      .populate('tags', 'name slug color isActive')
      .populate('user', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const response = {
      success: true,
      message: 'Product fetched successfully',
      product: buildProductResponse(product),
    };

    await CacheService.set(cacheKey, response, 3600);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
    });
  }
};

// @route GET /api/single-product/:id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product id',
      });
    }

    const cacheKey = `product:${id}`;
    const cachedProduct = await CacheService.get(cacheKey);
    if (cachedProduct) {
      return res.status(200).json(cachedProduct);
    }

    const product = await Product.findOne({ _id: id, isDeleted: false })
      .populate('category', 'name slug ancestors picture position isActive')
      .populate('categories', 'name slug ancestors picture position isActive')
      .populate('tags', 'name slug color isActive')
      .populate('user', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const response = {
      success: true,
      message: 'Product fetched successfully',
      product: buildProductResponse(product),
    };

    await CacheService.set(cacheKey, response, 3600);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching product by id:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
    });
  }
};

// @route GET /api/search-suggestions
// @desc Get search suggestions/autocomplete for products
// @access Public
const getSearchSuggestions = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(200).json({
        success: true,
        message: 'Search suggestions fetched successfully',
        data: []
      });
    }

    const searchTerm = q.trim();
    const searchLimit = Math.min(parseInt(limit) || 10, 20);

    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);

    const keywordPatterns = searchWords.map(keyword => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        $or: [
          { title: { $regex: `\\b${escapedKeyword}`, $options: 'i' } },
          { description: { $regex: `\\b${escapedKeyword}`, $options: 'i' } }
        ]
      };
    });

    const query = {
      stock: { $gt: 0 },
      $and: keywordPatterns.length > 0 ? keywordPatterns : []
    };

    const suggestions = await Product.aggregate([
      { $match: query },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              {
                $cond: [
                  { $regexMatch: { input: { $toLower: "$title" }, regex: `^${searchTerm.toLowerCase()}` } },
                  300, 0
                ]
              },
              {
                $cond: [
                  { $regexMatch: { input: { $toLower: "$title" }, regex: searchTerm.toLowerCase() } },
                  200, 0
                ]
              },
              {
                $cond: [
                  { $regexMatch: { input: { $toLower: "$title" }, regex: `^${searchWords[0]}\\b` } },
                  150, 0
                ]
              },
              {
                $cond: [
                  {
                    $and: searchWords.map(word => ({
                      $regexMatch: { input: { $toLower: "$title" }, regex: `\\b${word}\\b` }
                    }))
                  },
                  100, 0
                ]
              },
              {
                $sum: searchWords.map(word => ({
                  $cond: [
                    { $regexMatch: { input: { $toLower: "$title" }, regex: `\\b${word}\\b` } },
                    30, 0
                  ]
                }))
              },
              {
                $sum: searchWords.map(word => ({
                  $cond: [
                    { $regexMatch: { input: { $toLower: "$description" }, regex: `\\b${word}\\b` } },
                    10, 0
                  ]
                }))
              }
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, createdAt: -1 } },
      { $limit: searchLimit },
      {
        $project: {
          _id: 1,
          slug: 1,
          title: 1,
          picture: 1,
          price: 1,
          stock: 1,
          description: { $substr: ["$description", 0, 100] }
        }
      }
    ]);

    const formattedSuggestions = suggestions.map(product => ({
      _id: product._id,
      slug: product.slug,
      title: product.title,
      image: product.picture?.secure_url || null,
      price: product.price,
      stock: product.stock,
      description: product.description || ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Search suggestions fetched successfully',
      data: formattedSuggestions,
      count: formattedSuggestions.length
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching search suggestions',
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  importExcel,
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
