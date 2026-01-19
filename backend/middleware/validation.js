// Input validation middleware to prevent NoSQL injection and ensure data integrity

/**
 * Sanitizes string input to prevent NoSQL injection
 * Only allows alphanumeric characters, dashes, underscores, and dots
 */
const sanitizeId = (id) => {
  if (!id || typeof id !== 'string') {
    return null;
  }
  // Remove any characters that could be used for injection
  // Allow: alphanumeric, dashes, underscores, dots
  const sanitized = id.trim().replace(/[^a-zA-Z0-9._-]/g, '');
  return sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
};

/**
 * Validates that an ID parameter is safe and well-formed
 */
const validateIdParam = (req, res, next) => {
  const paramsToValidate = ['folderId', 'mealId', 'workoutId', 'fitbitUserId'];
  
  for (const param of paramsToValidate) {
    if (req.params[param]) {
      const sanitized = sanitizeId(req.params[param]);
      if (!sanitized) {
        return res.status(400).json({ 
          error: `Invalid ${param} format`,
          message: 'Parameter contains invalid characters or is too long'
        });
      }
      // Replace the original param with sanitized version
      req.params[param] = sanitized;
    }
  }
  
  next();
};

/**
 * Validates string inputs to prevent injection
 */
const sanitizeString = (str, maxLength = 1000) => {
  if (str === null || str === undefined) {
    return null;
  }
  if (typeof str !== 'string') {
    return String(str).substring(0, maxLength);
  }
  // Trim and limit length
  return str.trim().substring(0, maxLength);
};

/**
 * Validates numeric inputs
 */
const sanitizeNumber = (num, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) {
    return null;
  }
  return Math.max(min, Math.min(max, parsed));
};

/**
 * Validates email format to prevent injection
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const trimmed = email.trim().toLowerCase();
  // Basic email format validation (simple regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  // Limit length to prevent DoS
  return trimmed.length <= 254 ? trimmed : null;
};

module.exports = {
  sanitizeId,
  validateIdParam,
  sanitizeString,
  sanitizeNumber,
  validateEmail
};
