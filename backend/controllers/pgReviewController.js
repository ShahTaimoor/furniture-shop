const reviewModel = require('../models/postgres/reviewModel');
const productModel = require('../models/postgres/productModel');
const { query } = require('../config/postgres');

const findProductByIdentifier = async (identifier) => {
  if (!identifier) return null;
  const isUuid = /^[0-9a-f-]{36}$/i.test(identifier);
  if (isUuid) {
    const row = await productModel.findRawById(identifier);
    return row ? productModel.rowToProduct(row) : null;
  }
  const row = await productModel.findRawBySlug(identifier.toLowerCase());
  return row ? productModel.rowToProduct(row) : null;
};

const attachUsers = async (reviews) => {
  const userIds = Array.from(new Set(reviews.flatMap((r) => [r.user, r.adminResponse?.respondedBy]).filter(Boolean)));
  if (userIds.length === 0) return reviews;

  const { rows } = await query('select id, name, email from users where id = any($1::text[])', [userIds]);
  const userMap = new Map(rows.map((u) => [u.id, { _id: u.id, name: u.name, email: u.email }]));

  return reviews.map((review) => ({
    ...review,
    user: userMap.get(review.user) || review.user,
    adminResponse: review.adminResponse
      ? { ...review.adminResponse, respondedBy: userMap.get(review.adminResponse.respondedBy) || review.adminResponse.respondedBy }
      : undefined,
  }));
};

// @route GET /api/pg/reviews (admin: all reviews across products)
const getAllReviews = async (req, res) => {
  const { page = 1, limit = 20, sort = 'recent' } = req.query;
  try {
    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const { reviews, total } = await reviewModel.listAll({ page: numericPage, limit: numericLimit, sort });
    const enriched = await attachUsers(reviews);

    return res.status(200).json({
      success: true,
      message: 'All reviews fetched successfully',
      data: { reviews: enriched, pagination: { total, page: numericPage, limit: numericLimit, pages: Math.ceil(total / numericLimit) || 1 } },
    });
  } catch (error) {
    console.error('pg getAllReviews error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching all reviews' });
  }
};

// @route GET /api/pg/products/:identifier/reviews
const getProductReviews = async (req, res) => {
  const { identifier } = req.params;
  const { page = 1, limit = 10, sort = 'recent' } = req.query;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const { reviews, total } = await reviewModel.listByProduct({ productId: product._id, page: numericPage, limit: numericLimit, sort });
    const enriched = await attachUsers(reviews);

    return res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: { reviews: enriched, pagination: { total, page: numericPage, limit: numericLimit, pages: Math.ceil(total / numericLimit) || 1 } },
    });
  } catch (error) {
    console.error('pg getProductReviews error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching reviews' });
  }
};

// @route POST /api/pg/products/:identifier/reviews
const createReview = async (req, res) => {
  const { identifier } = req.params;
  const { rating, title, comment } = req.body;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (!rating) return res.status(400).json({ success: false, message: 'Rating is required' });
    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const userId = req.user._id.toString();
    const existing = await reviewModel.findByProductAndUser(product._id, userId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await reviewModel.create({ productId: product._id, userId, rating: numericRating, title, comment });
    const [enriched] = await attachUsers([review]);

    return res.status(201).json({ success: true, message: 'Review created successfully', data: enriched });
  } catch (error) {
    console.error('pg createReview error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating review' });
  }
};

// @route PUT /api/pg/products/:identifier/reviews/:reviewId
const updateReview = async (req, res) => {
  const { identifier, reviewId } = req.params;
  const { rating, title, comment } = req.body;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = await reviewModel.findById(reviewId);
    if (!review || review.product !== product._id) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = review.user === req.user._id.toString();
    const isAdminUser = [1, 2].includes(req.user.role);
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
    }

    const updated = await reviewModel.update(reviewId, { rating: rating !== undefined ? Number(rating) : undefined, title, comment });
    const [enriched] = await attachUsers([updated]);

    return res.status(200).json({ success: true, message: 'Review updated successfully', data: enriched });
  } catch (error) {
    console.error('pg updateReview error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating review' });
  }
};

// @route DELETE /api/pg/products/:identifier/reviews/:reviewId
const deleteReview = async (req, res) => {
  const { identifier, reviewId } = req.params;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = await reviewModel.findById(reviewId);
    if (!review || review.product !== product._id) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = review.user === req.user._id.toString();
    const isAdminUser = [1, 2].includes(req.user.role);
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }

    await reviewModel.remove(reviewId);
    return res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('pg deleteReview error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting review' });
  }
};

// @route PUT /api/pg/products/:identifier/reviews/:reviewId/reply
const replyToReview = async (req, res) => {
  const { identifier, reviewId } = req.params;
  const { message } = req.body;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = await reviewModel.findById(reviewId);
    if (!review || review.product !== product._id) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const updated = await reviewModel.setAdminResponse(reviewId, {
      message: message?.toString().trim(),
      respondedBy: req.user._id.toString(),
    });
    const [enriched] = await attachUsers([updated]);

    return res.status(200).json({ success: true, message: 'Admin response saved successfully', data: enriched });
  } catch (error) {
    console.error('pg replyToReview error:', error);
    res.status(500).json({ success: false, message: 'Server error while saving admin response' });
  }
};

module.exports = {
  getAllReviews,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  replyToReview,
};
