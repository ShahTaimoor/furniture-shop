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

module.exports = {
  parseJSONField,
  ensureArray,
  normalizeStringArray,
  syncPrimaryProductImage,
  normalizeAttributes,
  normalizeVariations,
};
