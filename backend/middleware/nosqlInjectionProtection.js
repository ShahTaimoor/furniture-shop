/**
 * NoSQL Injection Protection Middleware
 * Provides utilities and middleware to prevent MongoDB NoSQL injection attacks
 */

const mongoose = require('mongoose');
const validator = require('validator');

/**
 * Sanitize string input to prevent NoSQL injection
 * Escapes special MongoDB operators and regex patterns
 */
const sanitizeInput = (input) => {
  if (input === null || input === undefined) return null;
  
  // Convert to string if not already
  if (typeof input !== 'string') {
    input = String(input);
  }
  
  // Remove or escape dangerous characters for regex
  return input
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
};

/**
 * Sanitize object recursively to remove dangerous MongoDB operators
 */
const sanitizeObject = (obj, allowedFields = null) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Dangerous MongoDB operators that should never come from user input
  const dangerousOperators = [
    '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$exists', 
    '$regex', '$text', '$where', '$expr', '$jsonSchema', '$elemMatch',
    '$size', '$type', '$all', '$elemMatch', '$not', '$mod', '$nor',
    '$or', '$and', '$comment', '$meta', '$slice', '$natural'
  ];
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    // Remove dangerous operators
    if (dangerousOperators.includes(key)) {
      continue; // Skip this key
    }
    
    // If allowedFields is specified, only include those fields
    if (allowedFields && !allowedFields.includes(key)) {
      continue;
    }
    
    const value = obj[key];
    
    // Recursively sanitize nested objects and arrays
    if (typeof value === 'object' && value !== null && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId)) {
      sanitized[key] = sanitizeObject(value, allowedFields);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Validate and sanitize ObjectId
 */
const validateObjectId = (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

/**
 * Validate and sanitize array of ObjectIds
 */
const validateObjectIdArray = (ids) => {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }
  
  return ids
    .map(id => validateObjectId(id))
    .filter(id => id !== null);
};

/**
 * Sanitize regex pattern to prevent ReDoS and injection
 */
const sanitizeRegex = (pattern, maxLength = 100) => {
  if (!pattern || typeof pattern !== 'string') return '';
  
  // Limit length to prevent ReDoS
  if (pattern.length > maxLength) {
    pattern = pattern.substring(0, maxLength);
  }
  
  // Escape special regex characters
  return sanitizeInput(pattern);
};

/**
 * Build safe regex query with escaping
 */
const buildSafeRegex = (searchTerm, options = 'i') => {
  const sanitized = sanitizeRegex(searchTerm, 100);
  if (!sanitized) return null;
  
  return {
    $regex: sanitized,
    $options: options
  };
};

/**
 * Validate and sanitize query parameters
 */
const sanitizeQueryParams = (query, allowedParams = null) => {
  const sanitized = {};
  
  for (const key in query) {
    if (!query.hasOwnProperty(key)) continue;
    
    // If allowedParams specified, only include those
    if (allowedParams && !allowedParams.includes(key)) {
      continue;
    }
    
    const value = query[key];
    
    // Sanitize based on type
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Middleware to sanitize request body
 */
const sanitizeBody = (allowedFields = null) => {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitizeObject(req.body, allowedFields);
    }
    next();
  };
};

/**
 * Middleware to sanitize query parameters
 */
const sanitizeQuery = (allowedParams = null) => {
  return (req, res, next) => {
    if (req.query) {
      req.query = sanitizeQueryParams(req.query, allowedParams);
    }
    next();
  };
};

/**
 * Middleware to sanitize route parameters
 */
const sanitizeParams = () => {
  return (req, res, next) => {
    if (req.params) {
      for (const key in req.params) {
        if (req.params.hasOwnProperty(key) && typeof req.params[key] === 'string') {
          req.params[key] = sanitizeInput(req.params[key]);
        }
      }
    }
    next();
  };
};

/**
 * Build safe number range query
 */
const buildSafeRange = (min, max) => {
  const range = {};
  
  if (min !== undefined && min !== null && min !== '') {
    const minNum = Number(min);
    if (!isNaN(minNum) && isFinite(minNum)) {
      range.$gte = minNum;
    }
  }
  
  if (max !== undefined && max !== null && max !== '') {
    const maxNum = Number(max);
    if (!isNaN(maxNum) && isFinite(maxNum)) {
      range.$lte = maxNum;
    }
  }
  
  return Object.keys(range).length > 0 ? range : null;
};

/**
 * Validate and sanitize email
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  
  const normalized = email.toLowerCase().trim();
  if (validator.isEmail(normalized)) {
    return normalized;
  }
  return null;
};

/**
 * Validate and sanitize phone number
 */
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove non-digit characters except +, -, spaces
  const cleaned = phone.replace(/[^\d+\-\s]/g, '');
  
  // Basic validation - at least 7 digits
  if (cleaned.replace(/\D/g, '').length >= 7) {
    return cleaned.trim();
  }
  
  return null;
};

module.exports = {
  sanitizeInput,
  sanitizeObject,
  validateObjectId,
  validateObjectIdArray,
  sanitizeRegex,
  buildSafeRegex,
  sanitizeQueryParams,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  buildSafeRange,
  validateEmail,
  validatePhone,
};

