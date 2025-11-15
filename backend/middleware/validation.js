/**
 * Input Validation Middleware using express-validator
 * Provides validation and sanitization for request bodies and query parameters
 */

const { body, query, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Custom validators
const isValidObjectId = (value) => {
  if (!value) return false;
  return mongoose.Types.ObjectId.isValid(value);
};

const isPositiveNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num > 0;
};

const isNonNegativeNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= 0;
};

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// User validation rules
const userValidation = {
  signup: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9\s_-]+$/)
      .withMessage('Name can only contain letters, numbers, spaces, hyphens, and underscores'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      .optional(),
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d+\-\s()]+$/)
      .withMessage('Invalid phone number format')
      .isLength({ min: 7, max: 20 })
      .withMessage('Phone number must be between 7 and 20 characters'),
    handleValidationErrors
  ],

  login: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Username must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9\s_-]+$/)
      .withMessage('Username contains invalid characters'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    handleValidationErrors
  ],

  loginEmail: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9\s_-]+$/)
      .withMessage('Name contains invalid characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City must not exceed 100 characters'),
    handleValidationErrors
  ]
};

// Product validation rules
const productValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Product title is required')
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    body('category')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid category ID'),
    handleValidationErrors
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    handleValidationErrors
  ]
};

// Order validation rules
const orderValidation = {
  create: [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required and must not be empty'),
    body('products.*.id')
      .custom(isValidObjectId)
      .withMessage('Invalid product ID'),
    body('products.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Shipping address is required')
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    body('city')
      .trim()
      .notEmpty()
      .withMessage('City is required')
      .isLength({ max: 100 })
      .withMessage('City must not exceed 100 characters'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[\d+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
    handleValidationErrors
  ],

  guestOrder: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[\d+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Shipping address is required'),
    body('city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('products.*.id')
      .custom(isValidObjectId)
      .withMessage('Invalid product ID'),
    body('products.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    handleValidationErrors
  ]
};

// Query parameter validation
const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    handleValidationErrors
  ],

  productSearch: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Search term must not exceed 200 characters'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Min price must be a positive number')
      .toFloat(),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max price must be a positive number')
      .toFloat(),
    query('category')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid category ID'),
    handleValidationErrors
  ],

  objectIdParam: [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ]
};

// Coupon validation
const couponValidation = {
  create: [
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Coupon code is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Coupon code must be between 3 and 50 characters')
      .matches(/^[A-Z0-9_-]+$/)
      .withMessage('Coupon code can only contain uppercase letters, numbers, hyphens, and underscores'),
    body('discountType')
      .isIn(['percentage', 'fixed'])
      .withMessage('Discount type must be either "percentage" or "fixed"'),
    body('discountValue')
      .isFloat({ min: 0 })
      .withMessage('Discount value must be a positive number'),
    body('validFrom')
      .optional()
      .isISO8601()
      .withMessage('Valid from must be a valid date'),
    body('validUntil')
      .optional()
      .isISO8601()
      .withMessage('Valid until must be a valid date'),
    handleValidationErrors
  ]
};

module.exports = {
  userValidation,
  productValidation,
  orderValidation,
  queryValidation,
  couponValidation,
  handleValidationErrors,
  isValidObjectId,
  isPositiveNumber,
  isNonNegativeNumber
};
