const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// 导入路由
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 3000;

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});

// 中间件
app.use(helmet()); // 安全头
app.use(cors()); // 跨域支持
app.use(morgan('combined')); // 日志记录
app.use(express.json({ limit: '10mb' })); // JSON解析
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL编码解析
app.use(limiter); // 速率限制

// 静态文件服务
app.use(express.static('public'));

// 基础路由
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用CAB432 REST API - 图像处理服务',
    version: '1.0.0',
    status: '运行中',
    features: [
      '用户认证 (JWT)',
      '图像上传和处理',
      'CPU密集型任务',
      '任务状态跟踪',
      '负载测试支持'
    ],
    endpoints: {
      auth: '/api/auth',
      images: '/api/images',
      health: '/health'
    }
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '路由未找到',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/images/upload',
      'GET /api/images/tasks',
      'GET /api/images/task/:taskId',
      'GET /api/images/image/:taskId'
    ]
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: '文件上传错误',
      message: err.message
    });
  }
  
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📖 API文档: http://localhost:${PORT}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔐 测试用户: admin/admin123, user1/user123`);
});
