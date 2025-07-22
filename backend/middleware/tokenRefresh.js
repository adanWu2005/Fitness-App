const User = require('../models/User');
const fitbitAuthService = require('../services/fitbitAuthService');

// Middleware to refresh expired Fitbit tokens
const refreshTokenIfNeeded = async (req, res, next) => {
  try {
    // Only proceed if user has Fitbit tokens
    if (!req.user || !req.user.fitbitTokens) {
      console.log('[TokenRefresh] No user or no Fitbit tokens found');
      return next();
    }

    const { access_token, refresh_token, expires_at } = req.user.fitbitTokens;
    
    // Debug logging
    console.log('[TokenRefresh] Checking tokens for user:', req.user.email);
    console.log('[TokenRefresh] Access token exists:', !!access_token);
    console.log('[TokenRefresh] Refresh token exists:', !!refresh_token);
    console.log('[TokenRefresh] Expires at:', expires_at);
    console.log('[TokenRefresh] Current time:', Date.now());
    
    // Check if we have valid tokens
    if (!access_token || !refresh_token) {
      console.log('[TokenRefresh] Missing access_token or refresh_token, removing Fitbit connection');
      req.user.fitbitUserId = undefined;
      req.user.fitbitTokens = undefined;
      req.user.fitbitProfile = undefined;
      await req.user.save();
      return next();
    }
    
    // Check if token is expired or will expire in the next 5 minutes
    const now = Date.now();
    const fiveMinutesFromNow = now + (5 * 60 * 1000);
    
    if (expires_at && expires_at < fiveMinutesFromNow) {
      console.log('[TokenRefresh] Access token expired or expiring soon, refreshing...');
      
      try {
        // Refresh the token
        const newTokens = await fitbitAuthService.refreshAccessToken(refresh_token);
        
        // Update user's tokens in database
        req.user.fitbitTokens = {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: now + (newTokens.expires_in * 1000)
        };
        
        await req.user.save();
        
        console.log('[TokenRefresh] Token refreshed successfully');
      } catch (refreshError) {
        console.error('[TokenRefresh] Failed to refresh token:', refreshError.message);
        
        // If refresh fails, remove Fitbit connection
        req.user.fitbitUserId = undefined;
        req.user.fitbitTokens = undefined;
        req.user.fitbitProfile = undefined;
        await req.user.save();
        
        console.log('[TokenRefresh] Removed Fitbit connection due to refresh failure');
      }
    } else {
      console.log('[TokenRefresh] Token is still valid, no refresh needed');
    }
    
    next();
  } catch (error) {
    console.error('[TokenRefresh] Error in token refresh middleware:', error);
    next();
  }
};

// Helper function to check if a response indicates token expiration
const isTokenExpiredError = (error) => {
  if (!error.response || !error.response.data) return false;
  
  const data = error.response.data;
  
  // Check for Fitbit's expired token error
  if (data.errors && Array.isArray(data.errors)) {
    return data.errors.some(err => 
      err.errorType === 'expired_token' || 
      err.message?.includes('expired') ||
      err.message?.includes('invalid_token')
    );
  }
  
  // Check for 401 status with expired token message
  if (error.response.status === 401) {
    const message = data.message || data.error || '';
    return message.toLowerCase().includes('expired') || 
           message.toLowerCase().includes('invalid_token');
  }
  
  return false;
};

// Wrapper function to handle API calls with automatic token refresh
const withTokenRefresh = (apiCall) => {
  return async (req, res, next) => {
    try {
      // First attempt with current token
      await apiCall(req, res, next);
    } catch (error) {
      // Check if error is due to expired token
      if (isTokenExpiredError(error) && req.user && req.user.fitbitTokens) {
        console.log('[TokenRefresh] Detected expired token, attempting refresh...');
        
        try {
          // Refresh token
          const { refresh_token } = req.user.fitbitTokens;
          const newTokens = await fitbitAuthService.refreshAccessToken(refresh_token);
          
          // Update user's tokens
          req.user.fitbitTokens = {
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: Date.now() + (newTokens.expires_in * 1000)
          };
          
          await req.user.save();
          console.log('[TokenRefresh] Token refreshed, retrying API call...');
          
          // Retry the API call with new token
          await apiCall(req, res, next);
        } catch (refreshError) {
          console.error('[TokenRefresh] Failed to refresh token:', refreshError.message);
          
          // Remove Fitbit connection if refresh fails
          req.user.fitbitUserId = undefined;
          req.user.fitbitTokens = undefined;
          req.user.fitbitProfile = undefined;
          await req.user.save();
          
          // Return error response
          res.status(401).json({ 
            error: 'Fitbit token expired and could not be refreshed. Please reconnect your Fitbit account.' 
          });
        }
      } else {
        // Re-throw the original error if it's not a token expiration issue
        throw error;
      }
    }
  };
};

module.exports = {
  refreshTokenIfNeeded,
  withTokenRefresh,
  isTokenExpiredError
}; 