const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const {
  sanitizeInput,
  sanitizeRegex,
  buildSafeRegex,
} = require('../middleware/nosqlInjectionProtection');

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 24;
const DEFAULT_SORT = 'relevance';

const SORT_MAP = {
  relevance: { relevanceScore: -1, createdAt: -1 },
  'price-asc': { effectivePrice: 1, createdAt: -1 },
  'price-desc': { effectivePrice: -1, createdAt: -1 },
  latest: { createdAt: -1 },
  featured: { isFeatured: -1, totalSales: -1 },
};

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

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseListParam = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => item && item.toString().trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return value
    .toString()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const sanitizeSearchTerm = (term = '') => {
  if (!term) return '';
  return term
    .toString()
    .trim()
    .substring(0, 120)
    .replace(/[\u0000]/g, '')
    .replace(/\s+/g, ' ');
};

const buildTextSearch = (term) => term.split(' ').map((token) => `"${token}"`).join(' ');

const buildFuzzyRegex = (term) => {
  const sanitized = sanitizeRegex(term, 64);
  if (!sanitized) return null;
  const pattern = sanitized
    .split('')
    .map((char) => escapeRegExp(char))
    .join('.*?');
  return new RegExp(pattern, 'i');
};

const resolveCategoryIds = async (rawValues = []) => {
  if (!rawValues.length) return [];
  const ids = [];
  const slugs = [];

  rawValues.forEach((value) => {
    if (!value) return;
    if (mongoose.Types.ObjectId.isValid(value)) {
      ids.push(new mongoose.Types.ObjectId(value));
    } else {
      slugs.push(value.toLowerCase());
    }
  });

  if (slugs.length) {
    const categories = await Category.find({ slug: { $in: slugs } }).select('_id').lean();
    categories.forEach((cat) => ids.push(cat._id));
  }

  return ids;
};

const buildAttributeFilter = (attributeName, values) => {
  if (!values?.length) return null;
  const regexValues = values.map((value) => new RegExp(`^${escapeRegExp(value)}$`, 'i'));
  const nameRegex = new RegExp(`^${escapeRegExp(attributeName)}$`, 'i');

  return {
    $or: [
      {
        attributes: {
          $elemMatch: {
            name: nameRegex,
            value: { $in: regexValues },
          },
        },
      },
      {
        variations: {
          $elemMatch: {
            attributes: {
              $elemMatch: {
                name: nameRegex,
                value: { $in: regexValues },
              },
            },
          },
        },
      },
    ],
  };
};

const buildBrandFilter = (values) => {
  if (!values?.length) return null;
  const regexValues = values.map((value) => new RegExp(`^${escapeRegExp(value)}$`, 'i'));

  return {
    $or: [
      { brand: { $in: values } },
      {
        attributes: {
          $elemMatch: {
            name: /^brand$/i,
            value: { $in: regexValues },
          },
        },
      },
    ],
  };
};

const buildBaseMatch = (filters) => {
  const match = {
    isDeleted: false,
    status: 'active',
    visibility: { $ne: 'hidden' },
  };

  const andConditions = [];

  if (filters.categoryIds?.length) {
    match.categories = { $in: filters.categoryIds };
  }

  if (filters.availability?.length) {
    match.stockStatus = { $in: filters.availability };
  }

  const brandFilter = buildBrandFilter(filters.brands);
  if (brandFilter) {
    andConditions.push(brandFilter);
  }

  const colorFilter = buildAttributeFilter('color', filters.colors);
  if (colorFilter) {
    andConditions.push(colorFilter);
  }

  const sizeFilter = buildAttributeFilter('size', filters.sizes);
  if (sizeFilter) {
    andConditions.push(sizeFilter);
  }

  if (andConditions.length) {
    match.$and = andConditions;
  }

  return match;
};

const buildPriceMatch = (filters) => {
  const range = {};
  if (typeof filters.minPrice === 'number') {
    range.$gte = filters.minPrice;
  }
  if (typeof filters.maxPrice === 'number') {
    range.$lte = filters.maxPrice;
  }
  return Object.keys(range).length ? range : null;
};

const addSharedStages = (pipeline, filters) => {
  pipeline.push({
    $addFields: {
      effectivePrice: {
        $cond: [
          { $and: [{ $gt: ['$salePrice', 0] }, { $lte: ['$salePrice', '$price'] }] },
          '$salePrice',
          '$price',
        ],
      },
    },
  });

  const priceMatch = buildPriceMatch(filters);
  if (priceMatch) {
    pipeline.push({ $match: { effectivePrice: priceMatch } });
  }

  pipeline.push({
    $addFields: {
      popularityScore: {
        $log10: {
          $add: ['$totalSales', 1],
        },
      },
      stockPenalty: {
        $cond: [{ $eq: ['$stockStatus', 'out-of-stock'] }, 0.5, 0],
      },
    },
  });
};

const buildSortStage = (sortBy, includeRelevance) => {
  const key = sortBy && SORT_MAP[sortBy] ? sortBy : DEFAULT_SORT;
  if (key === 'relevance' || includeRelevance) {
    return {
      relevanceScore: -1,
      textScore: -1,
      popularityScore: -1,
      stockPenalty: 1,
      createdAt: -1,
    };
  }
  return SORT_MAP[key] || SORT_MAP[DEFAULT_SORT];
};

const formatProduct = (doc) => {
  if (!doc) return null;
  const primaryImage =
    doc.images?.find?.((image) => image.isPrimary)?.secure_url ||
    doc.images?.[0]?.secure_url ||
    doc.picture?.secure_url ||
    null;

  return {
    id: doc._id,
    _id: doc._id,
    title: doc.title,
    slug: doc.slug,
    brand: doc.brand || null,
    price: doc.price,
    salePrice: doc.salePrice && doc.salePrice > 0 ? doc.salePrice : null,
    effectivePrice: doc.effectivePrice || doc.salePrice || doc.price,
    stockStatus: doc.stockStatus,
    stock: doc.stock ?? 0,
    totalSales: doc.totalSales || 0,
    ratingAverage: doc.ratingAverage || 0,
    categories: doc.categories || [],
    tags: doc.tags || [],
    description: doc.description || '',
    sku: doc.sku,
    image: primaryImage,
    images: doc.images || [],
    textScore: doc.textScore || 0,
    relevanceScore: doc.relevanceScore || 0,
    popularityScore: doc.popularityScore || 0,
    createdAt: doc.createdAt,
  };
};

const formatFacetResponse = (facets = {}) => {
  const [priceRange = {}] = facets.priceRange || [];
  return {
    price: {
      min: priceRange.min ?? null,
      max: priceRange.max ?? null,
    },
    brands: (facets.brands || []).map((brand) => ({
      label: brand._id,
      value: brand._id,
      count: brand.count,
    })),
    categories: (facets.categories || []).map((category) => ({
      label: category.name,
      value: category.id,
      slug: category.slug,
      count: category.count,
    })),
    colors: (facets.colors || []).map((color) => ({
      label: color._id,
      value: color._id,
      count: color.count,
    })),
    sizes: (facets.sizes || []).map((size) => ({
      label: size._id,
      value: size._id,
      count: size.count,
    })),
    availability: (facets.availability || []).map((item) => ({
      label: item._id,
      value: item._id,
      count: item.count,
    })),
  };
};

const applyRanking = (searchTerm, docs = []) => {
  if (!searchTerm) return docs;
  const query = searchTerm.toLowerCase();

  return docs
    .map((doc) => {
      const title = (doc.title || '').toLowerCase();
      const description = (doc.description || '').toLowerCase();
      const exact = title === query ? 5 : title.startsWith(query) ? 3 : 0;
      const partial = title.includes(query) ? 2 : 0;
      const descriptionMatch = description.includes(query) ? 1 : 0;
      const popularity = doc.popularityScore || 0;
      const stockPenalty = doc.stockStatus === 'out-of-stock' ? -1 : 0;
      const textScore = doc.textScore || 0;

      return {
        ...doc,
        relevanceScore: textScore * 5 + exact + partial + descriptionMatch + popularity + stockPenalty,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

const buildFacetPipeline = (match, filters) => {
  const pipeline = [{ $match: match }];
  addSharedStages(pipeline, filters);

  pipeline.push({
    $facet: {
      priceRange: [
        {
          $group: {
            _id: null,
            min: { $min: '$effectivePrice' },
            max: { $max: '$effectivePrice' },
          },
        },
      ],
      brands: [
        { $match: { brand: { $exists: true, $ne: null } } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ],
      categories: [
        { $unwind: '$categories' },
        {
          $group: {
            _id: '$categories',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: '$category' },
        {
          $project: {
            _id: 0,
            id: '$category._id',
            name: '$category.name',
            slug: '$category.slug',
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ],
      colors: [
        { $unwind: '$attributes' },
        { $match: { 'attributes.name': /^color$/i } },
        {
          $group: {
            _id: '$attributes.value',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ],
      sizes: [
        { $unwind: '$attributes' },
        { $match: { 'attributes.name': /^size$/i } },
        {
          $group: {
            _id: '$attributes.value',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ],
      availability: [
        {
          $group: {
            _id: '$stockStatus',
            count: { $sum: 1 },
          },
        },
      ],
    },
  });

  return pipeline;
};

const parseFilters = async (query) => {
  const brandValues = parseListParam(query.brand).map((item) => sanitizeInput(item));
  const colorValues = parseListParam(query.color).map((item) => sanitizeInput(item));
  const sizeValues = parseListParam(query.size).map((item) => sanitizeInput(item));
  const availabilityValues = parseListParam(query.availability)
    .map((item) => item?.toLowerCase())
    .map((value) => AVAILABILITY_MAP[value] || value)
    .filter(Boolean);
  const categoryValues = parseListParam(query.category);
  const categoryIds = await resolveCategoryIds(categoryValues);

  const minPrice = Number(query.minPrice);
  const maxPrice = Number(query.maxPrice);

  return {
    brands: brandValues,
    colors: colorValues,
    sizes: sizeValues,
    availability: availabilityValues,
    categoryIds,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
  };
};

const runSearchAggregation = async ({
  match,
  filters,
  sortBy,
  page,
  limit,
  searchTerm,
  regexConditions = null,
}) => {
  const pipeline = [{ $match: match }];

  if (regexConditions) {
    pipeline.push({ $match: { $or: regexConditions } });
  }

  addSharedStages(pipeline, filters);

  if (searchTerm && !regexConditions) {
    pipeline.push({
      $addFields: {
        textScore: { $meta: 'textScore' },
      },
    });
  }

  pipeline.push({
    $addFields: {
      relevanceScore: {
        $subtract: [
          {
            $add: [
              { $ifNull: ['$textScore', 0] },
              { $ifNull: ['$popularityScore', 0] },
            ],
          },
          '$stockPenalty',
        ],
      },
    },
  });

  pipeline.push({
    $sort: buildSortStage(sortBy, Boolean(searchTerm && !regexConditions)),
  });

  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  pipeline.push({
    $project: {
      title: 1,
      slug: 1,
      price: 1,
      salePrice: 1,
      brand: 1,
      stock: 1,
      stockStatus: 1,
      totalSales: 1,
      ratingAverage: 1,
      categories: 1,
      tags: 1,
      description: 1,
      sku: 1,
      images: 1,
      picture: 1,
      textScore: 1,
      relevanceScore: 1,
      popularityScore: 1,
      createdAt: 1,
      effectivePrice: 1,
    },
  });

  return Product.aggregate(pipeline);
};

exports.searchProducts = async (req, res) => {
  const startedAt = Date.now();
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const sortBy = req.query.sort || DEFAULT_SORT;
    const searchTerm = sanitizeSearchTerm(req.query.q || req.query.search);
    const filters = await parseFilters(req.query);
    const baseMatch = buildBaseMatch(filters);

    let searchMatch = { ...baseMatch };

    if (searchTerm) {
      searchMatch = {
        ...searchMatch,
        $text: {
          $search: buildTextSearch(searchTerm),
          $caseSensitive: false,
          $diacriticSensitive: false,
        },
      };
    }

    const [count, docs, facetDocs] = await Promise.all([
      Product.countDocuments(searchMatch),
      runSearchAggregation({
        match: searchMatch,
        filters,
        sortBy,
        page,
        limit: requestedLimit,
        searchTerm,
      }),
      Product.aggregate(buildFacetPipeline(searchMatch, filters)),
    ]);

    let products = applyRanking(searchTerm, docs.map(formatProduct));
    let total = count;

    if (searchTerm && products.length < requestedLimit) {
      const fallbackRegex = buildFuzzyRegex(searchTerm);
      if (fallbackRegex) {
        const regexConditions = [
          { title: fallbackRegex },
          { description: fallbackRegex },
          { sku: fallbackRegex },
          { brand: fallbackRegex },
          { 'variations.name': fallbackRegex },
          { 'variations.sku': fallbackRegex },
        ];

        const fallbackMatch = {
          ...baseMatch,
          _id: { $nin: products.map((product) => product.id) },
        };

        const [fallbackCount, fallbackDocs] = await Promise.all([
          Product.countDocuments({
            ...fallbackMatch,
            $or: regexConditions,
          }),
          runSearchAggregation({
            match: fallbackMatch,
            filters,
            sortBy,
            page,
            limit: requestedLimit - products.length,
            regexConditions,
          }),
        ]);

        total += fallbackCount;
        const fallbackFormatted = applyRanking(searchTerm, fallbackDocs.map(formatProduct));
        products = [...products, ...fallbackFormatted];
      }
    }

    const facets = formatFacetResponse(facetDocs?.[0]);
    const pages = Math.max(Math.ceil(total / requestedLimit), 1);

    return res.json({
      success: true,
      data: {
        query: searchTerm,
        items: products,
        pagination: {
          page,
          limit: requestedLimit,
          total,
          pages,
          hasMore: page < pages,
        },
        filters: facets,
        appliedFilters: {
          ...filters,
        },
      },
      meta: {
        took: Date.now() - startedAt,
        sort: sortBy,
      },
    });
  } catch (error) {
    console.error('searchProducts error', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to complete search at the moment.',
    });
  }
};

exports.getSearchFilters = async (req, res) => {
  try {
    const searchTerm = sanitizeSearchTerm(req.query.q || req.query.search);
    const filters = await parseFilters(req.query);
    let match = buildBaseMatch(filters);

    if (searchTerm) {
      match = {
        ...match,
        $text: {
          $search: buildTextSearch(searchTerm),
          $caseSensitive: false,
          $diacriticSensitive: false,
        },
      };
    }

    const facets = await Product.aggregate(buildFacetPipeline(match, filters));

    return res.json({
      success: true,
      data: formatFacetResponse(facets?.[0]),
    });
  } catch (error) {
    console.error('getSearchFilters error', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load filters right now.',
    });
  }
};

exports.getPredictiveSuggestions = async (req, res) => {
  try {
    const query = sanitizeSearchTerm(req.query.q);
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);

    if (!query || query.length < 1) {
      return res.json({
        success: true,
        data: {
          products: [],
          categories: [],
          tags: [],
        },
      });
    }

    const fuzzyRegex = buildFuzzyRegex(query);
    const safeRegex = buildSafeRegex(query, 'i');

    const [products, categories, tags] = await Promise.all([
      Product.find({
        isDeleted: false,
        status: 'active',
        visibility: { $ne: 'hidden' },
        $or: [
          { title: safeRegex },
          { sku: safeRegex },
          { brand: safeRegex },
          ...(fuzzyRegex ? [{ title: fuzzyRegex }] : []),
        ],
      })
        .select('title slug price salePrice brand images picture categories stockStatus totalSales createdAt')
        .sort({ totalSales: -1, createdAt: -1 })
        .limit(limit)
        .lean(),
      Category.find({
        name: safeRegex,
      })
        .select('name slug picture')
        .limit(5)
        .lean(),
      Tag.find({
        name: safeRegex,
      })
        .select('name slug')
        .limit(8)
        .lean(),
    ]);

    const productSuggestions = products.map((product) => ({
      id: product._id,
      title: product.title,
      slug: product.slug,
      brand: product.brand || null,
      price: product.price,
      salePrice: product.salePrice && product.salePrice > 0 ? product.salePrice : null,
      stockStatus: product.stockStatus,
      image:
        product.images?.find?.((img) => img.isPrimary)?.secure_url ||
        product.images?.[0]?.secure_url ||
        product.picture?.secure_url ||
        null,
    }));

    const categorySuggestions = categories.map((category) => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      image: category.picture?.secure_url || null,
    }));

    const tagSuggestions = tags.map((tag) => ({
      id: tag._id,
      name: tag.name,
      slug: tag.slug,
    }));

    return res.json({
      success: true,
      data: {
        query,
        products: productSuggestions,
        categories: categorySuggestions,
        tags: tagSuggestions,
      },
    });
  } catch (error) {
    console.error('getPredictiveSuggestions error', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load predictive suggestions.',
    });
  }
};

