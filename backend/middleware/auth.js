const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
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
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded JWT:', decoded);
    const user = await User.findById(decoded.userId);
    console.log('User lookup by ID:', decoded.userId, 'User found:', !!user);
    
    if (!user) {
      console.log('User not found for decoded userId');
      return res.status(401).json({ error: 'User not found' });
    }

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

module.exports = {
  authenticateToken,
  requireFitbitConnection,
  generateToken
}; 