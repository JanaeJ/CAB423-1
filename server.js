const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and logging
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));

// Large file support for video uploads
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '5gb' }));

app.use(express.static('public'));

// Main endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CAB432 Video Processing API',
    version: '1.0.0',
    description: 'CPU-intensive video transcoding service',
    endpoints: {
      authentication: '/api/auth/login',
      upload: '/api/videos/upload',
      tasks: '/api/videos/tasks',
      health: '/health'
    },
    features: [
      'JWT Authentication',
      'Large video file support (up to 5GB)',
      'CPU-intensive H.265 transcoding',
      'Multiple quality presets',
      'Load testing support'
    ],
    testAccounts: {
      admin: 'admin/admin123',
      user: 'user1/user123'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large (max 5GB)'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/`);
});