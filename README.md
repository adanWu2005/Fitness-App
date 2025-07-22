# Fitness Tracker with Fitbit OAuth

A React-based fitness tracking application that integrates with Fitbit using OAuth 2.0 for secure authentication and data access.

## Features

- 🔐 **Secure OAuth 2.0 Authentication** with Fitbit
- 📊 **Real-time Fitness Data** (steps, calories)
- 🔄 **Automatic Token Refresh**
- 💾 **Persistent Authentication** (localStorage)
- 🎨 **Modern UI** with responsive design
- 🛡️ **CSRF Protection** with PKCE flow

## Prerequisites

Before running this application, you need to:

1. **Create a Fitbit Developer Account**
   - Go to [Fitbit Developer Portal](https://dev.fitbit.com/)
   - Sign up for a developer account
   - Create a new application

2. **Configure Your Fitbit App**
   - Set the **OAuth 2.0 Application Type** to "Web Application"
   - Add **Callback URL**: `http://localhost:3001/api/fitbit/auth/callback`
   - Note down your **Client ID** and **Client Secret**

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Fitbit OAuth Configuration
FITBIT_CLIENT_ID=your_client_id_here
FITBIT_CLIENT_SECRET=your_client_secret_here
FITBIT_REDIRECT_URI=http://localhost:3001/api/fitbit/auth/callback

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Installation & Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Start the Backend Server

```bash
cd backend
npm start
```

The backend will run on `http://localhost:3001`

### 4. Start the Frontend Development Server

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

### 5. Set Up Daily Completion Check (Optional)

To ensure accurate stats tracking, you can set up a cron job to run the daily completion check at midnight:

```bash
# Add this to your crontab (crontab -e)
0 0 * * * cd /path/to/your/project/backend && npm run check-daily-completions
```

This script ensures that every day is counted in user statistics, even if no goals were completed.

## How to Get Fitbit API Access Token

### Method 1: Using the Application (Recommended)

1. **Start both servers** (backend and frontend)
2. **Open your browser** and go to `http://localhost:3000`
3. **Click "Connect to Fitbit"** button
4. **Authorize the application** in the Fitbit popup
5. **Complete the OAuth flow** - you'll be redirected back and authenticated

### Method 2: Manual OAuth Flow

1. **Get Authorization URL**:
   ```bash
   curl http://localhost:3001/api/fitbit/auth/login
   ```

2. **Visit the returned URL** in your browser to authorize

3. **Handle the callback** - you'll be redirected to:
   ```
   http://localhost:3001/api/fitbit/auth/callback?code=AUTHORIZATION_CODE&state=STATE
   ```

4. **Get your tokens**:
   ```bash
   curl http://localhost:3001/api/fitbit/auth/tokens/USER_ID
   ```

### Method 3: Direct API Testing

Once authenticated, you can test the API directly:

```bash
# Get activity data
curl -H "x-user-id: YOUR_USER_ID" \
     -H "x-access-token: YOUR_ACCESS_TOKEN" \
     http://localhost:3001/api/fitbit/activity

# Get steps only
curl -H "x-user-id: YOUR_USER_ID" \
     -H "x-access-token: YOUR_ACCESS_TOKEN" \
     http://localhost:3001/api/fitbit/steps

# Get calories only
curl -H "x-user-id: YOUR_USER_ID" \
     -H "x-access-token: YOUR_ACCESS_TOKEN" \
     http://localhost:3001/api/fitbit/calories
```

## API Endpoints

### Authentication Endpoints

- `GET /api/fitbit/auth/login` - Get authorization URL
- `GET /api/fitbit/auth/callback` - Handle OAuth callback
- `GET /api/fitbit/auth/tokens/:userId` - Get user tokens
- `POST /api/fitbit/auth/refresh/:userId` - Refresh access token
- `POST /api/fitbit/auth/revoke/:userId` - Revoke tokens (logout)
- `GET /api/fitbit/auth/profile/:userId` - Get user profile
- `GET /api/fitbit/auth/users` - List authenticated users

### Data Endpoints

- `GET /api/fitbit/activity` - Get steps and calories
- `GET /api/fitbit/steps` - Get steps only
- `GET /api/fitbit/calories` - Get calories only

**Note**: All data endpoints require authentication headers:
- `x-user-id`: Your Fitbit user ID
- `x-access-token`: Your valid access token

## Token Management

### Access Token Lifecycle

1. **Initial Authorization**: User authorizes app → receives access token (valid for 8 hours)
2. **Token Refresh**: Before expiration, use refresh token to get new access token
3. **Token Revocation**: User can revoke access at any time

### Automatic Token Refresh

The application automatically handles token refresh when:
- Access token expires
- API calls return 401 (Unauthorized)
- User manually clicks "Refresh Token"

### Token Storage

- **Backend**: In-memory storage (use database in production)
- **Frontend**: localStorage for persistence across sessions

## Security Features

- **PKCE (Proof Key for Code Exchange)** - Prevents authorization code interception
- **State Parameter** - CSRF protection
- **Token Expiration** - Automatic validation
- **Secure Headers** - All API calls require authentication
- **HTTPS Ready** - Configure for production use

## Production Considerations

### Backend

1. **Database Storage**: Replace in-memory token storage with a database
2. **Environment Variables**: Use secure environment variable management
3. **HTTPS**: Enable HTTPS for all endpoints
4. **Rate Limiting**: Implement API rate limiting
5. **Logging**: Add comprehensive logging
6. **Error Handling**: Improve error handling and monitoring

### Frontend

1. **Environment Configuration**: Use proper environment variable management
2. **HTTPS**: Serve over HTTPS in production
3. **Token Security**: Consider more secure token storage methods
4. **Error Boundaries**: Add React error boundaries
5. **Loading States**: Improve loading and error states

## Troubleshooting

### Common Issues

1. **"Invalid client_id" Error**
   - Verify your `FITBIT_CLIENT_ID` in the `.env` file
   - Check that your Fitbit app is properly configured

2. **"Invalid redirect_uri" Error**
   - Ensure the callback URL matches exactly in your Fitbit app settings
   - Check the `FITBIT_REDIRECT_URI` environment variable

3. **"Access token has expired" Error**
   - The application should automatically refresh tokens
   - Try logging out and logging back in

4. **CORS Errors**
   - Ensure the backend CORS configuration includes your frontend URL
   - Check that both servers are running on the correct ports

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=fitbit:*
```

## License

This project is for educational purposes. Please ensure compliance with Fitbit's API terms of service.

## Support

For issues related to:
- **Fitbit API**: Check [Fitbit Developer Documentation](https://dev.fitbit.com/)
- **OAuth Implementation**: Review the authentication flow in `backend/services/fitbitAuthService.js`
- **Application Issues**: Check the browser console and server logs 