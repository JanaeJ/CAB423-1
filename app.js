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
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static files
app.use(express.static('public'));

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CAB432 Video Processing Job REST API',
    version: '1.0.0',
    description: 'REST API for CPU-intensive video processing jobs',
    student: 'Junning Jia (n11789450)',
    endpoints: {
      'GET /jobs': 'Get all video processing jobs',
      'POST /jobs': 'Create new video processing job (CPU-intensive)',
      'GET /jobs/:id': 'Get specific job details',
      'PUT /jobs/:id': 'Update job status',
      'DELETE /jobs/:id': 'Delete job'
    },
    features: [
      'CPU-intensive video transcoding jobs',
      'Job status tracking and progress monitoring',
      'Multi-user support with authentication',
      'Database persistence with MariaDB',
      'Real-time progress updates'
    ],
    testCredentials: {
      admin: 'admin/admin123',
      user: 'user1/user123'
    },
    cpuIntensiveNote: 'Each job runs CPU-intensive processing for 5+ minutes'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: 'connected',
    service: 'Video Job Processing API'
  });
});

// Simple authentication endpoint
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const users = {
    'admin': { id: 1, password: 'admin123', role: 'admin' },
    'user1': { id: 2, password: 'user123', role: 'user' }
  };
  
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { id: user.id, username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, username, role: user.role }
  });
});
  
  // Hardcoded users for demo
  const users = {
    'admin': { id: 1, password: 'admin123', role: 'admin' },
    'user1': { id: 2, password: 'user123', role: 'user' }
  };
  
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Simple token (in production, use JWT)
  const token = Buffer.from(`${user.id}:${username}:${user.role}`).toString('base64');
  
  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, username, role: user.role }
  });


// Job management routes
app.use('/jobs', jobsRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /auth/login', 
      'GET /jobs',
      'POST /jobs',
      'GET /jobs/:id',
      'PUT /jobs/:id',
      'DELETE /jobs/:id'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CAB432 Video Job API running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);

});