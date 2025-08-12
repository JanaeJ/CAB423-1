const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting - disabled for load testing
const limiter = (req, res, next) => next(); // Completely disable rate limiting for testing

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('combined'));

// Increase payload limits for large video files (5GB)
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '5gb' }));
app.use(limiter);

// Static files
app.use(express.static('public'));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CAB432 REST API - Ultra CPU-Intensive Video Processing Service',
    version: '1.0.0',
    status: 'running',
    features: [
      'User Authentication (JWT)',
      'Large Video Upload (up to 5GB)',
      'Ultra CPU-Intensive Video Transcoding',
      'Multiple Quality Presets',
      'H.264 and H.265 Encoding',
      'Task Status Tracking',
      'Load Testing Support'
    ],
    limits: {
      maxFileSize: '5GB',
      supportedFormats: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'],
      qualityPresets: ['fast', 'medium', 'slow (ultra CPU-intensive)'],
      resolutions: ['480p', '720p', '1080p', '4K']
    },
    endpoints: {
      auth: '/api/auth',
      videos: '/api/videos',
      health: '/health'
    },
    testAccounts: {
      admin: { username: 'admin', password: 'admin123' },
      user: { username: 'user1', password: 'user123' }
    },
    cpuIntensiveNote: 'Use "slow" quality preset for maximum CPU utilization'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    systemLimits: {
      maxFileSize: '5GB',
      payloadLimit: '5GB'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/videos/upload (supports up to 5GB)',
      'GET /api/videos/tasks',
      'GET /api/videos/task/:taskId',
      'GET /api/videos/video/:taskId',
      'GET /api/videos/videos (admin only)'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Maximum file size is 5GB',
        maxSize: '5GB'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
  }
  
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request payload exceeds the 5GB limit',
      maxSize: '5GB'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Test Users: admin/admin123, user1/user123`);
  console.log(`🎬 Ultra CPU-Intensive Video Processing Service Ready`);
  console.log(`📁 Maximum file size: 5GB`);
  console.log(`⚡ Use "slow" quality preset for maximum CPU utilization`);
  console.log(`🔥 CPU monitoring: Use Activity Monitor to watch node process`);
});