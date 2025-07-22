// Shared token storage for the application
// In production, this should be replaced with a database
const tokenStorage = new Map();

class TokenStorageService {
  // Store tokens for a user
  setTokens(userId, tokens) {
    tokenStorage.set(userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope
    });
  }

  // Get tokens for a user
  getTokens(userId) {
    return tokenStorage.get(userId);
  }

  // Check if user has valid tokens
  hasValidTokens(userId) {
    const tokens = tokenStorage.get(userId);
    return tokens && Date.now() < tokens.expiresAt;
  }

  // Update tokens (for refresh)
  updateTokens(userId, newTokens) {
    tokenStorage.set(userId, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
      scope: newTokens.scope
    });
  }

  // Remove tokens for a user
  removeTokens(userId) {
    tokenStorage.delete(userId);
  }

  // Get all users
  getAllUsers() {
    return Array.from(tokenStorage.keys()).map(userId => ({
      userId,
      hasValidToken: this.hasValidTokens(userId)
    }));
  }

  // Get the raw Map (for direct access if needed)
  getStorage() {
    return tokenStorage;
  }
}

module.exports = new TokenStorageService(); 