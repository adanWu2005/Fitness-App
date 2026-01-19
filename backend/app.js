require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const fitbitRoutes = require('./routes/fitbit');
const fitbitAuthRoutes = require('./routes/fitbitAuth');
const workoutsRoutes = require('./routes/workouts');
const foodRoutes = require('./routes/food');
const mealsRoutes = require('./routes/meals');
const authRoutes = require('./routes/auth');
const goalsRoutes = require('./routes/goals');

// Redis Client (for caching and session management - matches architecture diagram)
const { initRedis, closeRedis } = require('./services/redisClient');

const app = express();
const PORT = process.env.PORT || 3001;

// Redis Connection (Architecture: Auth Service → Redis Cluster)
// Initialize Redis for caching user data and token blacklisting
initRedis();

// MongoDB Connection (Architecture: Auth Service → Primary DB)
// Render MongoDB or MongoDB Atlas automatically handles replication to Replica DB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[MongoDB] Connected to Primary DB');
    // Note: MongoDB Atlas automatically replicates to Replica DB for read scaling
  })
  .catch(err => console.error('[MongoDB] Connection error:', err));

// Middleware
app.use(cors({
  origin: [
    'https://fitterjitter.onrender.com', // ngrok tunnel
    'http://localhost:3000',
    'http://localhost:8081'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Trust proxy (important for Render and other platforms behind load balancers)
// This ensures req.ip gets the real client IP, not the proxy IP
app.set('trust proxy', 1);

// Rate Limiting (Architecture: Rate Limiter → API Server/OAuth Gateway)
// Apply general rate limiting to all API routes
const { generalLimiter, authLimiter, sensitiveOperationLimiter, accountOperationLimiter, userLimiter } = require('./middleware/rateLimiter');

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

console.log('[RateLimit] Rate limiting enabled for API routes');

// Check if frontend build directory exists and serve static files
const frontendBuildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  console.log('Serving static files from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));
} else {
  console.log('Frontend build directory not found at:', frontendBuildPath);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/fitbit', fitbitRoutes);
app.use('/api/fitbit/auth', fitbitAuthRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/goals', goalsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If build doesn't exist, send a simple message
    res.status(404).json({ 
      error: 'Frontend not built',
      message: 'Please run npm run build in the frontend directory',
      path: indexPath
    });
  }
});

// Error handling middleware for payload size issues
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ 
      error: 'Invalid JSON payload',
      message: 'The request body contains invalid JSON or is too large'
    });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum allowed size of 50MB'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      error: 'Unexpected file field',
      message: 'An unexpected file field was detected in the request'
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'Payload too large',
      message: 'The request payload exceeds the maximum allowed size of 50MB'
    });
  }
  
  next(error);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log('[Architecture] User → Rate Limiter → Load Balancer → Auth Service (multiple instances) → Redis Cluster + Primary DB → Replica DB');
});

// Graceful shutdown - close Redis connection on exit
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  await closeRedis();
  server.close(() => {
    console.log('[Server] Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  await closeRedis();
  server.close(() => {
    console.log('[Server] Process terminated');
    process.exit(0);
  });
});

// Debug environment variables (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log("[Config] FITBIT_CLIENT_ID:", process.env.FITBIT_CLIENT_ID ? 'Set' : 'Not set');
  console.log("[Config] FITBIT_CLIENT_SECRET:", process.env.FITBIT_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log("[Config] FITBIT_REDIRECT_URI:", process.env.FITBIT_REDIRECT_URI || 'Not set');
  console.log("[Config] REDIS_URL:", process.env.REDIS_URL ? 'Set' : 'Not set (Redis disabled)');
  console.log("[Config] MONGODB_URI:", process.env.MONGODB_URI ? 'Set' : 'Using default');
}