const axios = require('axios');
const crypto = require('crypto');

class FitbitAuthService {
  constructor() {
    // Fitbit OAuth configuration
    this.clientId = process.env.FITBIT_CLIENT_ID;
    this.clientSecret = process.env.FITBIT_CLIENT_SECRET;
    this.redirectUri = process.env.FITBIT_REDIRECT_URI || 'http://localhost:3001/api/fitbit/auth/callback';
    this.scope = 'activity heartrate location nutrition profile settings sleep social weight';
    
    // Authorization URLs
    this.authUrl = 'https://www.fitbit.com/oauth2/authorize';
    this.tokenUrl = 'https://api.fitbit.com/oauth2/token';
    
    // Store state for CSRF protection
    this.pendingAuths = new Map();
  }

  // Generate authorization URL for user to visit
  generateAuthUrl() {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    // Store for later verification
    this.pendingAuths.set(state, { codeVerifier, timestamp: Date.now() });
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state) {
    try {
      // Verify state
      const pendingAuth = this.pendingAuths.get(state);
      if (!pendingAuth) {
        throw new Error('Invalid or expired state parameter');
      }

      // Clean up old pending auths (older than 10 minutes)
      this.cleanupPendingAuths();

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: pendingAuth.codeVerifier
      });

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      });

      // Remove the pending auth
      this.pendingAuths.delete(state);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        scope: response.data.scope,
        user_id: response.data.user_id
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        scope: response.data.scope
      };
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Revoke access token
  async revokeToken(token, tokenType = 'access_token') {
    try {
      const params = new URLSearchParams({
        token: token,
        token_type_hint: tokenType
      });

      await axios.post('https://api.fitbit.com/oauth2/revoke', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      });

      return true;
    } catch (error) {
      console.error('Error revoking token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Clean up old pending authorizations
  cleanupPendingAuths() {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [state, auth] of this.pendingAuths.entries()) {
      if (auth.timestamp < tenMinutesAgo) {
        this.pendingAuths.delete(state);
      }
    }
  }

  // Get user profile information
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get('https://api.fitbit.com/1/user/-/profile.json', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new FitbitAuthService(); 