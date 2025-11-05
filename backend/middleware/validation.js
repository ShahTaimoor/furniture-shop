const Joi = require('joi');
const { body, param, query, validationResult } = require('express-validator');

// Custom validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation schemas
const userValidation = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    
    handleValidationErrors
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
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
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    
    handleValidationErrors
  ]
};

// Product validation schemas
const productValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    
    body('price')
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('stock')
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    
    body('category')
      .isMongoId()
      .withMessage('Please provide a valid category ID'),
    
    body('brand')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Brand name must be less than 50 characters'),
    
    handleValidationErrors
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    
    body('price')
      .optional()
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    
    handleValidationErrors
  ],

  getById: [
    param('id')
      .isMongoId()
      .withMessage('Please provide a valid product ID'),
    
    handleValidationErrors
  ]
};

// Category validation schemas
const categoryValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Category name can only contain letters and spaces'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description must be less than 200 characters'),
    
    handleValidationErrors
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Please provide a valid category ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Category name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Category name can only contain letters and spaces'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description must be less than 200 characters'),
    
    handleValidationErrors
  ]
};

// Order validation schemas
const orderValidation = {
  create: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Order must contain at least one item'),
    
    body('items.*.product')
      .isMongoId()
      .withMessage('Please provide valid product IDs'),
    
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),
    
    body('shippingAddress.street')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Street address must be between 5 and 100 characters'),
    
    body('shippingAddress.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    
    body('shippingAddress.postalCode')
      .trim()
      .isLength({ min: 3, max: 10 })
      .withMessage('Postal code must be between 3 and 10 characters'),
    
    body('shippingAddress.country')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Country must be between 2 and 50 characters'),
    
    handleValidationErrors
  ]
};

// Query parameter validation
const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sortBy')
      .optional()
      .isIn(['name', 'price', 'createdAt', 'updatedAt'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc', '1', '-1'])
      .withMessage('Sort order must be asc, desc, 1, or -1'),
    
    handleValidationErrors
  ]
};

// Joi schemas for complex validation
const joiSchemas = {
  user: {
    register: Joi.object({
      name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
      phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional()
    }),
    
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },
  
  product: {
    create: Joi.object({
      title: Joi.string().min(3).max(100).required(),
      description: Joi.string().min(10).max(1000).required(),
      price: Joi.number().positive().required(),
      stock: Joi.number().integer().min(0).required(),
      category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      brand: Joi.string().max(50).optional()
    }),
    
    update: Joi.object({
      title: Joi.string().min(3).max(100).optional(),
      description: Joi.string().min(10).max(1000).optional(),
      price: Joi.number().positive().optional(),
      stock: Joi.number().integer().min(0).optional()
    })
  }
};

module.exports = {
  userValidation,
  productValidation,
  categoryValidation,
  orderValidation,
  queryValidation,
  joiSchemas,
  handleValidationErrors
};
