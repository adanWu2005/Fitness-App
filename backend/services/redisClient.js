// Redis client for caching and session management
// Compatible with Render Redis and other Redis services
const Redis = require('ioredis');

let redisClient = null;

// Initialize Redis connection
const initRedis = () => {
  // Redis connection URL from environment (for Render Redis, Upstash, etc.)
  // Format: redis://user:password@host:port or rediss:// for TLS
  const REDIS_URL = process.env.REDIS_URL;
  
  if (!REDIS_URL) {
    console.warn('[Redis] REDIS_URL not configured. Redis features will be disabled.');
    console.warn('[Redis] For Render: Add Redis service and set REDIS_URL environment variable');
    return null;
  }

  try {
    const options = {
      // Enable automatic reconnection
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Connection timeout
      connectTimeout: 10000,
      // Enable keep-alive
      keepAlive: 30000,
      // Enable offline queue (buffer commands when disconnected)
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    };

    // Parse Redis URL to determine if TLS is needed
    if (REDIS_URL.startsWith('rediss://')) {
      options.tls = {
        rejectUnauthorized: false // For cloud Redis services that use self-signed certs
      };
    }

    redisClient = new Redis(REDIS_URL, options);

    redisClient.on('connect', () => {
      console.log('[Redis] Connected to Redis cluster');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Redis client ready');
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Redis connection error:', err.message);
      // Don't throw - allow app to continue without Redis
    });

    redisClient.on('close', () => {
      console.log('[Redis] Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting to Redis...');
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize Redis:', error.message);
    return null;
  }
};

// Get Redis client (lazy initialization)
const getRedis = () => {
  if (!redisClient) {
    redisClient = initRedis();
  }
  return redisClient;
};

// Check if Redis is available
const isRedisAvailable = () => {
  return redisClient && redisClient.status === 'ready';
};

// Graceful shutdown
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Redis connection closed gracefully');
    } catch (error) {
      console.error('[Redis] Error closing Redis connection:', error.message);
    }
  }
};

module.exports = {
  getRedis,
  initRedis,
  isRedisAvailable,
  closeRedis
};
