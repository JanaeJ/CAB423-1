const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { tasks, processedImages } = require('../config/database');

const router = express.Router();

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图像文件'), false);
    }
  }
});

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
const processedDir = path.join(__dirname, '../processed');

// 创建目录
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });
  } catch (error) {
    console.error('创建目录失败:', error);
  }
})();

// CPU密集型图像处理函数
const processImageIntensively = async (imageBuffer, options) => {
  const {
    resize = { width: 800, height: 600 },
    quality = 80,
    format = 'jpeg',
    blur = 0,
    sharpen = 0,
    rotate = 0,
    flip = false,
    flop = false,
    grayscale = false,
    sepia = false,
    brightness = 1,
    contrast = 1,
    saturation = 1,
    hue = 0
  } = options;

  let pipeline = sharp(imageBuffer);

  // 应用各种图像处理操作（CPU密集型）
  if (resize) {
    pipeline = pipeline.resize(resize.width, resize.height, {
      kernel: sharp.kernel.lanczos3,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  if (blur > 0) {
    pipeline = pipeline.blur(blur);
  }

  if (sharpen > 0) {
    pipeline = pipeline.sharpen(sharpen);
  }

  if (rotate !== 0) {
    pipeline = pipeline.rotate(rotate);
  }

  if (flip) {
    pipeline = pipeline.flip();
  }

  if (flop) {
    pipeline = pipeline.flop();
  }

  if (grayscale) {
    pipeline = pipeline.grayscale();
  }

  if (sepia) {
    pipeline = pipeline.tint({ r: 112, g: 66, b: 20 });
  }

  // 应用颜色调整
  pipeline = pipeline.modulate({
    brightness: brightness,
    saturation: saturation,
    hue: hue
  });

  pipeline = pipeline.linear(contrast, -(contrast - 1) / 2);

  // 输出格式设置
  if (format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality, progressive: true });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality, effort: 6 });
  }

  return pipeline.toBuffer();
};

// 上传并处理图像
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图像文件' });
    }

    const taskId = uuidv4();
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName);
    const processedFileName = `${taskId}${fileExtension}`;
    const processedFilePath = path.join(processedDir, processedFileName);

    // 创建任务记录
    const task = {
      id: taskId,
      userId: req.user.id,
      originalName,
      status: 'processing',
      createdAt: new Date(),
      options: req.body
    };

    tasks.push(task);

    // 异步处理图像（CPU密集型）
    processImageIntensively(req.file.buffer, req.body)
      .then(async (processedBuffer) => {
        // 保存处理后的图像
        await fs.writeFile(processedFilePath, processedBuffer);

        // 更新任务状态
        task.status = 'completed';
        task.completedAt = new Date();
        task.processedFilePath = processedFilePath;

        // 保存处理记录
        processedImages.push({
          id: taskId,
          userId: req.user.id,
          originalName,
          processedFileName,
          processedFilePath,
          createdAt: new Date(),
          options: req.body
        });

        console.log(`图像处理完成: ${taskId}`);
      })
      .catch(async (error) => {
        console.error(`图像处理失败: ${taskId}`, error);
        task.status = 'failed';
        task.error = error.message;
      });

    res.json({
      message: '图像上传成功，正在处理中',
      taskId,
      status: 'processing'
    });

  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取任务状态
router.get('/task/:taskId', authenticateToken, (req, res) => {
  const task = tasks.find(t => t.id === req.params.taskId);
  
  if (!task) {
    return res.status(404).json({ error: '任务未找到' });
  }

  // 检查权限
  if (task.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  res.json(task);
});

// 获取用户的所有任务
router.get('/tasks', authenticateToken, (req, res) => {
  const userTasks = tasks.filter(t => t.userId === req.user.id);
  res.json(userTasks);
});

// 获取处理后的图像
router.get('/image/:taskId', authenticateToken, async (req, res) => {
  try {
    const processedImage = processedImages.find(img => img.id === req.params.taskId);
    
    if (!processedImage) {
      return res.status(404).json({ error: '图像未找到' });
    }

    // 检查权限
    if (processedImage.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 检查文件是否存在
    try {
      await fs.access(processedImage.processedFilePath);
    } catch (error) {
      return res.status(404).json({ error: '图像文件未找到' });
    }

    res.sendFile(processedImage.processedFilePath);
  } catch (error) {
    console.error('获取图像错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取所有处理后的图像（管理员）
router.get('/images', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  res.json(processedImages);
});

module.exports = router;
