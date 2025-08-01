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

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-tracker';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

console.log("FITBIT_CLIENT_ID:", process.env.FITBIT_CLIENT_ID);
console.log("FITBIT_CLIENT_SECRET:", process.env.FITBIT_CLIENT_SECRET);
console.log("FITBIT_REDIRECT_URI:", process.env.FITBIT_REDIRECT_URI);