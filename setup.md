# Quick Setup Guide

## 1. Create Fitbit Developer Account

1. Go to [Fitbit Developer Portal](https://dev.fitbit.com/)
2. Sign up and create a new application
3. Set OAuth 2.0 Application Type to "Web Application"
4. Add Callback URL: `http://localhost:3001/api/fitbit/auth/callback`
5. Copy your Client ID and Client Secret

## 2. Set Environment Variables

Create a `.env` file in the `backend` directory:

```env
FITBIT_CLIENT_ID=your_client_id_here
FITBIT_CLIENT_SECRET=your_client_secret_here
FITBIT_REDIRECT_URI=http://localhost:3001/api/fitbit/auth/callback
PORT=3001
NODE_ENV=development
```

## 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## 4. Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## 5. Get Your Access Token

1. Open `http://localhost:3000` in your browser
2. Click "Connect to Fitbit"
3. Authorize the application
4. You're now authenticated! The app will automatically use your access token.

## Testing the API

Once authenticated, you can test the API directly:

```bash
# Get your user ID and access token from the browser console or localStorage
curl -H "x-user-id: YOUR_USER_ID" \
     -H "x-access-token: YOUR_ACCESS_TOKEN" \
     http://localhost:3001/api/fitbit/activity
```

## Troubleshooting

- **"Invalid client_id"**: Check your `.env` file
- **"Invalid redirect_uri"**: Ensure callback URL matches exactly
- **CORS errors**: Make sure both servers are running
- **Token expired**: The app will automatically refresh tokens 