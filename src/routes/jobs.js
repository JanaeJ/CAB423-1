const express = require('express');
const router = express.Router();
const controller = require('../controllers/jobs');

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [id, username, role] = decoded.split(':');
      req.user = { 
        id: parseInt(id), 
        username, 
        role 
      };
    } catch (e) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid authentication token' 
      });
    }
  }
  
  next();
};

// Apply authentication to all routes
router.use(authenticate);

// REST API routes - exactly as required by CAB432
router.get('/', controller.getAllJobs);           // GET /jobs - Get all jobs
router.post('/', controller.createJob);           // POST /jobs - Create job (CPU-intensive)
router.get('/:id', controller.getJobById);        // GET /jobs/:id - Get specific job
router.put('/:id', controller.updateJob);         // PUT /jobs/:id - Update job
router.delete('/:id', controller.deleteJob);      // DELETE /jobs/:id - Delete job

module.exports = router;