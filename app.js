// Backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const promptRoutes = require('./routes/prompts');
const replyRoutes = require('./routes/replies');
const notificationRoutes = require('./routes/notifications');
const resetPasswordRoute = require('./routes/resetPassword');

// Debug middleware for prompts route
app.use('/api/prompts', (req, res, next) => {
  console.log('Prompts route accessed:', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body
  });
  next();
});

// Serve static files from the React app with proper MIME types
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/replies', replyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth/reset-password', resetPasswordRoute);

// Config route for frontend
app.get('/api/config', (req, res) => {
  res.json({
    GROQ_API_KEY: process.env.REACT_APP_GROQ_API_KEY,
    API_VERSION: '1.0',
    ENVIRONMENT: process.env.NODE_ENV
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Handle React routing in production
app.get('*', (req, res, next) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  
  // Log the attempt to serve index.html
  console.log('Attempting to serve index.html from:', indexPath);
  
  // Check if the file exists before sending
  try {
    if (!require('fs').existsSync(indexPath)) {
      console.error('index.html not found at:', indexPath);
      throw new Error('index.html not found');
    }
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        next(err);
      }
    });
  } catch (error) {
    console.error('Error checking for index.html:', error);
    next(error);
  }
});

// 404 handler - Add this before error handler
app.use((req, res, next) => {
  if (!res.headersSent) {
    console.log(`404 - Not Found: ${req.method} ${req.path}`);
    res.status(404).json({ 
      message: 'Route not found',
      requestedPath: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log the error details
  console.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't send error details in production
  const errorResponse = {
    message: 'Server Error',
    path: req.path,
    timestamp: new Date().toISOString()
  };

  // Add error details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }

  // Handle specific error types
  if (err.code === 'ENOENT') {
    res.status(404).json({
      ...errorResponse,
      message: 'Resource not found'
    });
  } else {
    res.status(err.status || 500).json(errorResponse);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Optionally implement notification system for critical errors
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally implement notification system for critical errors
});

module.exports = app;