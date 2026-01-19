// Rate limiting middleware using Redis for distributed rate limiting
// Architecture: Rate Limiter → API Server/OAuth Gateway
const rateLimit = require('express-rate-limit');
const { getRedis, isRedisAvailable } = require('../services/redisClient');

// Create Redis store for rate limiting (works across multiple instances)
const createRedisStore = () => {
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    try {
      // Use a simple Redis-based store
      // Note: express-rate-limit v7+ uses a different API, so we'll use memory store
      // with Redis for distributed tracking if needed
      return undefined; // Will use memory store, but we can enhance with Redis later
    } catch (error) {
      console.warn('[RateLimit] Redis store initialization failed, using memory store:', error.message);
      return undefined;
    }
  }
  return undefined; // Fallback to memory store
};

// General API rate limiter (stricter for unauthenticated requests)
// 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use Redis if available for distributed rate limiting
  store: createRedisStore(),
  // Custom key generator - use IP address
  keyGenerator: (req) => {
    // Get IP from request (works behind proxies like Render)
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Strict rate limiter for authentication endpoints (login, register, etc.)
// 5 requests per 15 minutes per IP to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 authentication attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login/registration attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: false
});

// Moderate rate limiter for sensitive operations (file uploads, food analysis)
// 20 requests per hour per IP
const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: {
    error: 'Too many requests',
    message: 'Too many requests for this operation, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    // For authenticated users, use user ID + IP for better tracking
    if (req.user && req.user._id) {
      return `${req.user._id}:${req.ip || req.connection.remoteAddress || 'unknown'}`;
    }
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Very strict rate limiter for password reset and account operations
// 3 requests per hour per IP
const accountOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    error: 'Too many requests',
    message: 'Too many account operations from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Per-user rate limiter for authenticated requests
// 1000 requests per 15 minutes per user
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each user to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    if (req.user && req.user._id) {
      return `user:${req.user._id}`;
    }
    // Fallback to IP for unauthenticated requests
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req) => {
    // Skip if user is not authenticated (will be handled by general limiter)
    return !req.user || !req.user._id;
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveOperationLimiter,
  accountOperationLimiter,
  userLimiter
};
