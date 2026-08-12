const Review = require('../models/Review');
const { findProductByIdentifier } = require('../utils/productHelpers');

const sortOptions = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 }
};

// @route GET /api/reviews
// @desc Get all reviews across products
// @access Private/Admin
const getAllReviews = async (req, res) => {
  const { page = 1, limit = 20, sort = 'recent' } = req.query;

  try {
    const selectedSort = sortOptions[sort] || sortOptions.recent;
    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const [reviews, total] = await Promise.all([
      Review.find({})
        .populate('user', 'name email')
        .populate('adminResponse.respondedBy', 'name email')
        .populate('product', 'title slug')
        .sort(selectedSort)
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit),
      Review.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      message: 'All reviews fetched successfully',
      data: {
        reviews,
        pagination: {
          total,
          page: numericPage,
          limit: numericLimit,
          pages: Math.ceil(total / numericLimit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching all reviews' });
  }
};

// @route GET /api/products/:identifier/reviews
// @desc Get reviews for a single product
// @access Public
const getProductReviews = async (req, res) => {
  const { identifier } = req.params;
  const { page = 1, limit = 10, sort = 'recent' } = req.query;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const selectedSort = sortOptions[sort] || sortOptions.recent;

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const [reviews, total] = await Promise.all([
      Review.find({ product: product._id })
        .populate('user', 'name email')
        .populate('adminResponse.respondedBy', 'name email')
        .sort(selectedSort)
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit),
      Review.countDocuments({ product: product._id })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: {
        reviews,
        pagination: {
          total,
          page: numericPage,
          limit: numericLimit,
          pages: Math.ceil(total / numericLimit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching reviews' });
  }
};

// @route POST /api/products/:identifier/reviews
// @desc Create a review for a product
// @access Private
const createReview = async (req, res) => {
  const { identifier } = req.params;
  const { rating, title, comment } = req.body;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const existingReview = await Review.findOne({ product: product._id, user: req.user._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      product: product._id,
      user: req.user._id,
      rating: numericRating,
      title,
      comment
    });

    await review.populate([
      { path: 'user', select: 'name email' },
      { path: 'adminResponse.respondedBy', select: 'name email' }
    ]);

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Server error while creating review' });
  }
};

// @route PUT /api/products/:identifier/reviews/:reviewId
// @desc Update a review (owner or admin)
// @access Private
const updateReview = async (req, res) => {
  const { identifier, reviewId } = req.params;
  const { rating, title, comment } = req.body;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = await Review.findOne({ _id: reviewId, product: product._id });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdminUser = [1, 2].includes(req.user.role);

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      review.rating = numericRating;
    }

    if (title !== undefined) {
      review.title = title;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();
    await review.populate([
      { path: 'user', select: 'name email' },
      { path: 'adminResponse.respondedBy', select: 'name email' }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, message: 'Server error while updating review' });
  }
};

// @route DELETE /api/products/:identifier/reviews/:reviewId
// @desc Delete a review (owner or admin)
// @access Private
const deleteReview = async (req, res) => {
  const { identifier, reviewId } = req.params;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = await Review.findOne({ _id: reviewId, product: product._id });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdminUser = [1, 2].includes(req.user.role);

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }

    await Review.findByIdAndDelete(review._id);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting review' });
  }
};

// @route PUT /api/products/:identifier/reviews/:reviewId/reply
// @desc Admin reply to a review
// @access Private/Admin
const replyToReview = async (req, res) => {
  const { identifier, reviewId } = req.params;
  const { message } = req.body;

  try {
    const product = await findProductByIdentifier(identifier);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const review = await Review.findOne({ _id: reviewId, product: product._id });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (!message || !message.toString().trim()) {
      review.adminResponse = undefined;
    } else {
      review.adminResponse = {
        message: message.toString().trim(),
        respondedBy: req.user._id,
        respondedAt: new Date()
      };
    }

    await review.save();
    await review.populate([
      { path: 'user', select: 'name email' },
      { path: 'adminResponse.respondedBy', select: 'name email' }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Admin response saved successfully',
      data: review
    });
  } catch (error) {
    console.error('Error replying to review:', error);
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
