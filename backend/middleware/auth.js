const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getRedis, isRedisAvailable } = require('../services/redisClient');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Cache TTL for user data in Redis (5 minutes)
const USER_CACHE_TTL = 300;

// Middleware to verify JWT token
// Architecture: Auth Service checks Redis cache before querying Primary DB
const authenticateToken = async (req, res, next) => {
  console.log('authenticateToken middleware called');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('Authorization header:', authHeader);
  console.log('Extracted token:', token);

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check if token is blacklisted in Redis (for logout/revocation)
    const redis = getRedis();
    if (redis && isRedisAvailable()) {
      const blacklisted = await redis.get(`token:blacklist:${token}`);
      if (blacklisted) {
        console.log('Token is blacklisted');
        return res.status(403).json({ error: 'Token has been revoked' });
      }
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded JWT:', decoded);
    
    // Try to get user from Redis cache first (Architecture: Auth Service → Redis Cluster)
    // Note: redis variable already declared above (line 26)
    let user = null;
    const userId = decoded.userId.toString();
    
    if (redis && isRedisAvailable()) {
      try {
        const cachedUser = await redis.get(`user:${userId}`);
        if (cachedUser) {
          console.log('User found in Redis cache');
          user = JSON.parse(cachedUser);
        }
      } catch (cacheError) {
        console.warn('[Redis] Cache read error:', cacheError.message);
        // Continue to database lookup if cache fails
      }
    }
    
    // If not in cache, query Primary DB (Architecture: Auth Service → Primary DB)
    if (!user) {
      // Don't use .lean() - we need Mongoose document for .save() method
      user = await User.findById(userId);
      console.log('User lookup by ID from Primary DB:', userId, 'User found:', !!user);
      
      // Cache user data in Redis for future requests (reduce DB load)
      // Convert to plain object for caching
      if (user && redis && isRedisAvailable()) {
        try {
          const userPlain = user.toObject();
          await redis.setex(`user:${userId}`, USER_CACHE_TTL, JSON.stringify(userPlain));
          console.log('User data cached in Redis');
        } catch (cacheError) {
          console.warn('[Redis] Cache write error:', cacheError.message);
          // Continue even if caching fails
        }
      }
    } else {
      // User from cache is a plain object - convert back to Mongoose document for .save() support
      // Only do this if we need to call .save() later (check req.method)
      user = await User.findById(userId);
    }
    
    if (!user) {
      console.log('User not found for decoded userId');
      return res.status(401).json({ error: 'User not found' });
    }

    // Set user on request (Mongoose document for methods like save())
    req.user = user;
    console.log('User authenticated, calling next()');
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user has Fitbit connected
const requireFitbitConnection = async (req, res, next) => {
  console.log('[Auth] Checking Fitbit connection for user:', req.user.email);
  console.log('[Auth] User Fitbit data:', {
    hasFitbitUserId: !!req.user.fitbitUserId,
    hasFitbitTokens: !!req.user.fitbitTokens,
    tokenDetails: req.user.fitbitTokens ? {
      hasAccessToken: !!req.user.fitbitTokens.access_token,
      hasRefreshToken: !!req.user.fitbitTokens.refresh_token,
      expiresAt: req.user.fitbitTokens.expires_at
    } : null
  });
  
  if (!req.user.fitbitUserId || !req.user.fitbitTokens) {
    console.log('[Auth] Fitbit connection required but not found');
    return res.status(403).json({ error: 'Fitbit connection required' });
  }
  next();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Blacklist token in Redis (for logout)
const blacklistToken = async (token, expiresIn = 604800) => {
  // expiresIn defaults to 7 days (same as JWT expiration)
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    try {
      await redis.setex(`token:blacklist:${token}`, expiresIn, '1');
      console.log('Token blacklisted in Redis');
      return true;
    } catch (error) {
      console.warn('[Redis] Failed to blacklist token:', error.message);
      return false;
    }
  }
  return false;
};

// Invalidate user cache in Redis (call when user data changes)
const invalidateUserCache = async (userId) => {
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    try {
      await redis.del(`user:${userId}`);
      console.log('User cache invalidated in Redis');
      return true;
    } catch (error) {
      console.warn('[Redis] Failed to invalidate user cache:', error.message);
      return false;
    }
  }
  return false;
};

module.exports = {
  authenticateToken,
  requireFitbitConnection,
  generateToken,
  blacklistToken,
  invalidateUserCache
}; 