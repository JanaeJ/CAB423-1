const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobs');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// 文件上传配置
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 所有路由都需要认证
router.use(authenticateToken);

// REST API 路由
router.get('/', jobController.getAllJobs);           // GET /jobs
router.post('/', upload.single('video'), jobController.createJob);  // POST /jobs
router.get('/:id', jobController.getJobById);        // GET /jobs/:id
router.put('/:id', jobController.updateJob);         // PUT /jobs/:id
router.delete('/:id', jobController.deleteJob);      // DELETE /jobs/:id

module.exports = router;