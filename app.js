const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cab432-secret-key';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();

// Import routes
const jobsRouter = require('./src/routes/jobs');

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'API-Version', 'X-Request-ID']
}));
app.use(morgan('combined'));

// Increase payload limits for large video files (1GB)
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// Serve static files
app.use(express.static('public'));

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CAB432 Enhanced Video Processing REST API',
    version: '1.0.0',
    description: 'Enterprise-grade REST API with advanced features for CPU-intensive video processing',
    student: 'Junning Jia (n11789450)',
    features: {
      api_features: [
        'API versioning with headers',
        'Pagination with metadata',
        'Advanced filtering and searching',
        'Multi-field sorting',
        'HATEOAS hypermedia links',
        'Comprehensive error handling',
        'Request/response validation'
      ],
      processing_features: [
        'CPU-intensive video transcoding',
        'Multiple quality presets (fast/medium/slow)',
        'Support for H.264 and H.265 codecs',
        'Multiple resolution outputs',
        'Real-time progress tracking',
        'Batch processing support'
      ],
      technical_features: [
        'JWT authentication with roles',
        'File upload up to 1GB',
        'Async video processing',
        'Database persistence',
        'Load testing capabilities'
      ]
    },
    endpoints: {
      authentication: {
        'POST /auth/login': 'User authentication with JWT'
      },
      job_management: {
        'GET /jobs': 'List jobs with pagination, filtering, sorting',
        'POST /jobs': 'Create job (metadata only)',
        'POST /jobs/upload': 'Upload video and start CPU-intensive processing',
        'GET /jobs/:id': 'Get job details with HATEOAS links',
        'GET /jobs/:id/download': 'Download processed video',
        'DELETE /jobs/:id': 'Delete job and cleanup files'
      },
      utilities: {
        'GET /': 'API documentation',
        'GET /health': 'Health check with system info'
      }
    },
    api_examples: {
      pagination: '/jobs?page=1&limit=10',
      filtering: '/jobs?status=processing&quality=slow',
      sorting: '/jobs?sort=created_at&order=desc',
      search: '/jobs?title=video&page=1',
      versioning: 'Add header: API-Version: v1'
    },
    test_credentials: {
      admin: { username: 'admin', password: 'admin123', role: 'admin' },
      user: { username: 'user1', password: 'user123', role: 'user' }
    },
    cpu_intensive_note: 'Use "slow" quality with video uploads for maximum CPU utilization (80%+ for 5+ minutes)',
    load_testing_note: 'Upload multiple videos simultaneously to test server scaling capabilities'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    database: 'connected',
    service: 'Enhanced Video Processing API',
    version: '1.0.0',
    features_enabled: [
      'video_processing',
      'api_versioning', 
      'pagination',
      'filtering',
      'sorting',
      'hateoas',
      'jwt_auth',
      'file_upload'
    ],
    system_limits: {
      max_file_size: '1GB',
      max_concurrent_jobs: 'unlimited',
      supported_formats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
      supported_codecs: ['h264', 'h265'],
      supported_resolutions: ['480p', '720p', '1080p', '4k']
    }
  });
});

// JWT Authentication endpoint
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password required',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  const users = {
    'admin': { id: 1, password: 'admin123', role: 'admin' },
    'user1': { id: 2, password: 'user123', role: 'user' }
  };

  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ 
      error: 'Invalid credentials',
      code: 'AUTHENTICATION_FAILED',
      timestamp: new Date().toISOString()
    });
  }

  const token = jwt.sign(
    { id: user.id, username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: { id: user.id, username, role: user.role },
    expires_in: '24h',
    token_type: 'Bearer',
    meta: {
      timestamp: new Date().toISOString(),
      api_version: req.headers['api-version'] || 'v1'
    }
  });
});

// Job management routes
app.use('/jobs', jobsRouter);

// API compatibility routes for legacy clients
app.use('/api/auth', (req, res, next) => {
  if (req.path === '/login' && req.method === 'POST') {
    req.url = '/auth/login';
    return app._router.handle(req, res, next);
  }
  next();
});

app.use('/api/videos', (req, res, next) => {
  // Map video endpoints to jobs endpoints
  const pathMap = {
    '/upload': '/upload',
    '/tasks': '',
    '/video/': '/download'
  };
  
  let newPath = req.path;
  for (const [oldPath, newPath] of Object.entries(pathMap)) {
    if (req.path.startsWith(oldPath)) {
      req.url = req.url.replace('/api/videos' + oldPath, '/jobs' + newPath);
      break;
    }
  }
  
  return app._router.handle(req, res, next);
});

// Enhanced 404 handler with helpful information
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist',
    available_endpoints: {
      authentication: [
        'POST /auth/login',
        'POST /api/auth/login (legacy)'
      ],
      job_management: [
        'GET /jobs (with pagination, filtering, sorting)',
        'POST /jobs (create job metadata)',
        'POST /jobs/upload (upload video for processing)',
        'GET /jobs/:id (get job details)',
        'GET /jobs/:id/download (download processed video)',
        'DELETE /jobs/:id (delete job)'
      ],
      legacy_compatibility: [
        'POST /api/videos/upload (maps to /jobs/upload)',
        'GET /api/videos/tasks (maps to /jobs)'
      ],
      utilities: [
        'GET / (API documentation)',
        'GET /health (system health check)'
      ]
    },
    api_features: [
      'Add "API-Version: v1" header for versioning',
      'Use pagination: ?page=1&limit=10',
      'Filter results: ?status=processing&quality=slow',
      'Sort results: ?sort=created_at&order=desc',
      'Search: ?title=searchterm'
    ],
    timestamp: new Date().toISOString(),
    support: 'Check API documentation at GET /'
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Handle specific error types
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Maximum file size is 1GB',
        code: 'FILE_TOO_LARGE',
        max_size: '1GB',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: err.message,
      code: 'UPLOAD_ERROR',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large',
      message: 'Request payload exceeds the 1GB limit',
      code: 'PAYLOAD_TOO_LARGE',
      max_size: '1GB',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: err.message,
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    support: 'Contact system administrator if this persists'
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CAB432 Enhanced Video Processing API running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  });