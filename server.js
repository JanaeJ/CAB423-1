const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./src/routes/jobs'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Main endpoint - API Documentation
app.get('/', (req, res) => {
  res.json({
    name: 'CAB432 Video Processing REST API',
    version: '1.0.0',
    description: 'CPU-intensive video transcoding job management system',
    endpoints: {
      authentication: {
        'POST /api/auth/login': 'User authentication'
      },
      jobs: {
        'GET /api/jobs': 'Get all video processing jobs',
        'POST /api/jobs': 'Create new video processing job (CPU-intensive)',
        'GET /api/jobs/:id': 'Get specific job status',
        'PUT /api/jobs/:id': 'Update job status',
        'DELETE /api/jobs/:id': 'Delete job'
      },
      system: {
        'GET /health': 'Health check'
      }
    },
    features: [
      'JWT Authentication',
      'CPU-intensive video transcoding jobs',
      'Job status tracking',
      'Multi-user support',
      'Database persistence'
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
    database: 'connected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);  

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health', 
      'POST /api/auth/login',
      'GET /api/jobs',
      'POST /api/jobs',
      'GET /api/jobs/:id',
      'PUT /api/jobs/:id',
      'DELETE /api/jobs/:id'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CAB432 Video Processing API running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
});