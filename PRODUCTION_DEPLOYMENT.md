# Production Deployment Guide

## Multi-User Fitbit Fitness App

This guide will help you deploy the fitness app to production with proper multi-user support where each user connects to their own unique Fitbit account.

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
MONGODB_URI=mongodb://your-production-mongodb-uri

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Fitbit API Configuration
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret
FITBIT_REDIRECT_URI=https://yourdomain.com/api/fitbit/auth/callback
FRONTEND_CALLBACK_URL=https://yourdomain.com/callback.html

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### 2. Generate Secure Secrets

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate MongoDB URI (if using MongoDB Atlas)
# Format: mongodb+srv://username:password@cluster.mongodb.net/fitness-tracker
```

### 3. Fitbit App Configuration

1. Go to [Fitbit Developer Portal](https://dev.fitbit.com/)
2. Create a new app
3. Set OAuth 2.0 settings:
   - **Callback URL**: `https://yourdomain.com/api/fitbit/auth/callback`
   - **Application Type**: Web Application
   - **OAuth 2.0 Scopes**: 
     - `activity`
     - `heartrate`
     - `location`
     - `nutrition`
     - `profile`
     - `settings`
     - `sleep`
     - `social`
     - `weight`

## 📦 Deployment Options

### Option A: Heroku Deployment

#### Backend Deployment

1. **Create Heroku App**
```bash
heroku create your-fitness-app-backend
```

2. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set FITBIT_CLIENT_ID=your-fitbit-client-id
heroku config:set FITBIT_CLIENT_SECRET=your-fitbit-client-secret
heroku config:set FITBIT_REDIRECT_URI=https://your-app.herokuapp.com/api/fitbit/auth/callback
heroku config:set FRONTEND_CALLBACK_URL=https://your-frontend-domain.com/callback.html
```

3. **Deploy Backend**
```bash
cd backend
git init
git add .
git commit -m "Initial backend deployment"
heroku git:remote -a your-fitness-app-backend
git push heroku main
```

#### Frontend Deployment

1. **Build Frontend**
```bash
cd frontend
npm run build
```

2. **Deploy to Netlify/Vercel**
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `build`
   - Set environment variable: `REACT_APP_API_URL=https://your-backend.herokuapp.com/api`

### Option B: AWS Deployment

#### Backend (EC2)

1. **Launch EC2 Instance**
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

2. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/your-repo/fitness-app.git
cd fitness-app/backend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your production values

# Start with PM2
pm2 start app.js --name "fitness-backend"
pm2 startup
pm2 save
```

#### Frontend (S3 + CloudFront)

1. **Create S3 Bucket**
```bash
aws s3 mb s3://your-fitness-app-frontend
aws s3 website s3://your-fitness-app-frontend --index-document index.html --error-document index.html
```

2. **Build and Deploy**
```bash
cd frontend
npm run build
aws s3 sync build/ s3://your-fitness-app-frontend
```

### Option C: Docker Deployment

#### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/fitness-tracker
      - JWT_SECRET=${JWT_SECRET}
      - FITBIT_CLIENT_ID=${FITBIT_CLIENT_ID}
      - FITBIT_CLIENT_SECRET=${FITBIT_CLIENT_SECRET}
      - FITBIT_REDIRECT_URI=${FITBIT_REDIRECT_URI}
      - FRONTEND_CALLBACK_URL=${FRONTEND_CALLBACK_URL}
    depends_on:
      - mongo
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

#### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "app.js"]
```

#### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Production Configuration

### 1. Database Setup

#### MongoDB Atlas (Recommended)

1. Create MongoDB Atlas cluster
2. Set up database user with read/write permissions
3. Configure network access (IP whitelist or 0.0.0.0/0 for all)
4. Get connection string

#### Local MongoDB

```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database
mongo
use fitness-tracker
```

### 2. SSL/HTTPS Setup

#### Using Let's Encrypt (Nginx)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Security Configuration

#### Environment Variables

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -hex 64)
MONGODB_PASSWORD=$(openssl rand -base64 32)

# Set production environment
NODE_ENV=production
```

#### CORS Configuration

Update `backend/app.js`:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 👥 Multi-User Management

### 1. User Account Creation

#### Using the Management Script

```bash
# List all users
node scripts/user-management.js list

# Create a new user
node scripts/user-management.js create john@example.com "John Doe" securepassword123

# Reset user password
node scripts/user-management.js reset-password john@example.com newpassword123

# Disconnect user from Fitbit
node scripts/user-management.js disconnect-fitbit john@example.com
```

#### Using the API

```bash
# Register new user
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "displayName": "John Doe",
    "password": "securepassword123"
  }'
```

### 2. Fitbit Account Setup

Each user must:

1. **Create their own Fitbit account** at [fitbit.com](https://www.fitbit.com)
2. **Use a unique email** for their Fitbit account
3. **Connect their Fitbit account** through the app

#### User Onboarding Process

1. User registers/logs into your app
2. User clicks "Connect to Fitbit"
3. App shows setup guide explaining the need for unique Fitbit accounts
4. User creates or uses their existing Fitbit account
5. User authorizes the app through Fitbit OAuth
6. App connects the user's Fitbit account to their profile

### 3. Monitoring and Maintenance

#### Check Fitbit Connections

```bash
# Check all Fitbit connections
node scripts/check-fitbit-connections.js

# Disconnect specific Fitbit account
node scripts/check-fitbit-connections.js disconnect FITBIT_USER_ID
```

#### Database Backup

```bash
# MongoDB backup
mongodump --uri="mongodb://your-mongodb-uri" --out=/backup/$(date +%Y%m%d)

# Restore from backup
mongorestore --uri="mongodb://your-mongodb-uri" /backup/20240101/
```

## 📊 Monitoring and Analytics

### 1. Application Monitoring

#### PM2 Monitoring

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs fitness-backend

# Restart application
pm2 restart fitness-backend
```

#### Health Check Endpoint

Add to `backend/app.js`:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### 2. Error Tracking

#### Sentry Integration

```bash
npm install @sentry/node
```

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: |
          cd backend
          npm ci
          npm test
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.14
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "your-fitness-app-backend"
          heroku_email: "your-email@example.com"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v1.2
        with:
          publish-dir: './frontend/build'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Fitbit Connection Errors

**Problem**: "This Fitbit account is already connected to another user"

**Solution**: 
- Each user needs their own unique Fitbit account
- Use the management script to disconnect existing connections
- Guide users to create new Fitbit accounts

#### 2. CORS Errors

**Problem**: Frontend can't connect to backend

**Solution**:
- Check CORS configuration in backend
- Verify environment variables
- Ensure HTTPS is properly configured

#### 3. Database Connection Issues

**Problem**: Can't connect to MongoDB

**Solution**:
- Verify MongoDB URI
- Check network access (IP whitelist)
- Ensure database user has proper permissions

#### 4. JWT Token Issues

**Problem**: Authentication failures

**Solution**:
- Verify JWT_SECRET is set correctly
- Check token expiration settings
- Ensure frontend is sending Authorization header

### Support Commands

```bash
# Check application status
pm2 status

# View application logs
pm2 logs

# Restart application
pm2 restart all

# Check database connections
node scripts/check-fitbit-connections.js

# List all users
node scripts/user-management.js list
```

## 📈 Scaling Considerations

### 1. Database Scaling

- Use MongoDB Atlas for automatic scaling
- Implement database indexing for performance
- Consider read replicas for high-traffic scenarios

### 2. Application Scaling

- Use load balancers for multiple backend instances
- Implement caching (Redis) for frequently accessed data
- Use CDN for static assets

### 3. Monitoring Scaling

- Set up application performance monitoring (APM)
- Implement comprehensive logging
- Use alerting for critical issues

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all user inputs
5. **Regular Updates**: Keep dependencies updated
6. **Backup Strategy**: Regular database backups
7. **Access Control**: Implement proper user permissions

## 📞 Support

For additional support:

1. Check the troubleshooting section above
2. Review application logs
3. Use the management scripts for diagnostics
4. Monitor Fitbit API rate limits
5. Verify environment configuration

---

**Remember**: Each user must have their own unique Fitbit account for the multi-user system to work correctly. This ensures data privacy and prevents conflicts between users. 