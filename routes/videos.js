const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { tasks, processedVideos } = require('../config/database');

const router = express.Router();

// Configure file upload with 5GB limit
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Ensure directories exist
const uploadDir = path.join(__dirname, '../uploads');
const processedDir = path.join(__dirname, '../processed');

(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create directories:', error);
  }
})();

// Ultra CPU-intensive video transcoding function
const transcodeVideo = (inputPath, outputPath, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      resolution = '720p',
      quality = 'medium',
      codec = 'h264'
    } = options;

    let ffmpegCommand = ffmpeg(inputPath)
      .videoCodec(codec === 'h264' ? 'libx264' : 'libx265')
      .audioCodec('aac')
      .audioBitrate(128);

    // Ultra CPU-intensive settings
    if (quality === 'slow') {
      ffmpegCommand = ffmpegCommand.outputOptions([
         '-preset veryslow',        // 最慢预设
          '-crf 12',                // 极高质量（比15更CPU密集）
          '-bf 16',                 // 最大B帧
          '-refs 16',               // 最大参考帧
          '-subme 11',              // 最大子像素运动估计
          '-me_range 32',           // 最大运动搜索范围
          '-g 300',                 // 大GOP
          '-keyint_min 30',         // 最小关键帧间隔
          '-sc_threshold 40',       // 场景切换阈值
          '-qcomp 0.6',            // 量化曲线压缩
          '-qmin 1',               // 最小量化（极高质量）
          '-qmax 51',              // 最大量化
          '-qdiff 4',              // 相邻帧量化差异
          '-trellis 2',            // Trellis量化
          '-partitions +parti8x8+parti4x4+partp8x8+partb8x8',
          '-direct-pred 3',        // 直接预测模式
          '-flags +loop',          // 环路滤波
          '-deblock 1:0:0',        // 去块滤波
          '-analyse 0x3:0x113',    // 分析选项
          '-no-fast-pskip',        // 禁用快速跳过
          '-no-dct-decimate',      // 禁用DCT抽取
          '-threads 1',            // 强制单线程（关键！）
          '-x264-params ref=16:bframes=16:subme=11:me_range=32:rc_lookahead=120:partitions=all:8x8dct:cabac:weightb:mixed_refs:chroma_me:me_tesa'
      ]);
    } else if (quality === 'medium') {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset slower',      // Very slow preset
        '-crf 18',            // High quality
        '-bf 8',              // Many B-frames
        '-refs 8',            // Many reference frames
        '-subme 9',           // High subpixel motion estimation
        '-me_range 16',       // Large motion search range
        '-threads 2'          // Limited threads
      ]);
    } else {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset slow',
        '-crf 23',
        '-threads 4'
      ]);
    }

    // Set resolution (higher = more CPU intensive)
    if (resolution === '1080p') {
      ffmpegCommand = ffmpegCommand.size('1920x1080');
    } else if (resolution === '720p') {
      ffmpegCommand = ffmpegCommand.size('1280x720');
    } else if (resolution === '480p') {
      ffmpegCommand = ffmpegCommand.size('854x480');
    } else if (resolution === '4k') {
      ffmpegCommand = ffmpegCommand.size('3840x2160');
    }

    // Add CPU-intensive video filters
    const filters = [];
    
    // Always apply high-quality scaling
    filters.push('scale=iw:ih:flags=lanczos');
    
    // Add enhancement filters for maximum CPU usage
    if (quality === 'slow' || quality === 'medium') {
      filters.push('unsharp=5:5:1.0:5:5:0.0'); // Sharpening filter
      filters.push('eq=contrast=1.1:brightness=0.05:saturation=1.1'); // Color adjustment
      filters.push('hqdn3d=4:3:6:4.5'); // High quality denoise
    }
    
    if (filters.length > 0) {
      ffmpegCommand = ffmpegCommand.videoFilters(filters);
    }

    ffmpegCommand
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg process started with ultra CPU-intensive settings:');
        console.log(commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent ? progress.percent.toFixed(2) : 'N/A'}% done - Time: ${progress.timemark || 'N/A'}`);
      })
      .on('end', () => {
        console.log('Ultra CPU-intensive transcoding finished successfully');
        resolve({ success: true, outputPath });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
};

// Upload and process video
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a video file' });
    }

    const taskId = uuidv4();
    const originalName = req.file.originalname;
    const inputPath = req.file.path;
    const outputFileName = `${taskId}.mp4`;
    const outputPath = path.join(processedDir, outputFileName);

    console.log(`Received video upload: ${originalName}, Size: ${(req.file.size / (1024*1024)).toFixed(2)}MB`);

    // Create task record
    const task = {
      id: taskId,
      userId: req.user.id,
      originalName,
      inputPath,
      outputPath,
      status: 'processing',
      createdAt: new Date(),
      options: req.body,
      fileSize: req.file.size
    };

    tasks.push(task);

    // Asynchronous video transcoding (Ultra CPU-intensive)
    transcodeVideo(inputPath, outputPath, req.body)
      .then(async (result) => {
        // Update task status
        task.status = 'completed';
        task.completedAt = new Date();

        // Save processing record
        processedVideos.push({
          id: taskId,
          userId: req.user.id,
          originalName,
          outputFileName,
          outputPath,
          createdAt: new Date(),
          options: req.body,
          fileSize: req.file.size
        });

        console.log(`Video transcoding completed: ${taskId}`);

        // Clean up original file to save space
        try {
          await fs.unlink(inputPath);
          console.log(`Cleaned up original file: ${inputPath}`);
        } catch (error) {
          console.log(`Failed to cleanup original file: ${error.message}`);
        }
      })
      .catch(async (error) => {
        console.error(`Video transcoding failed: ${taskId}`, error);
        task.status = 'failed';
        task.error = error.message;

        // Clean up files
        try {
          await fs.unlink(inputPath);
        } catch (e) {
          console.log(`Cleanup error: ${e.message}`);
        }
      });

    res.json({
      message: 'Video uploaded successfully, ultra CPU-intensive transcoding in progress',
      taskId,
      status: 'processing',
      originalName,
      fileSize: `${(req.file.size / (1024*1024)).toFixed(2)}MB`,
      estimatedTime: 'This will take a while due to ultra CPU-intensive settings'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task status
router.get('/task/:taskId', authenticateToken, (req, res) => {
  const task = tasks.find(t => t.id === req.params.taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Check permissions
  if (task.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  res.json(task);
});

// Get all user tasks
router.get('/tasks', authenticateToken, (req, res) => {
  const userTasks = tasks.filter(t => t.userId === req.user.id);
  res.json(userTasks);
});

// Download processed video
router.get('/video/:taskId', authenticateToken, async (req, res) => {
  try {
    const processedVideo = processedVideos.find(video => video.id === req.params.taskId);
    
    if (!processedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check permissions
    if (processedVideo.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if file exists
    try {
      await fs.access(processedVideo.outputPath);
    } catch (error) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Set appropriate headers for video download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${processedVideo.outputFileName}"`);
    
    res.sendFile(path.resolve(processedVideo.outputPath));
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all processed videos (admin only)
router.get('/videos', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  res.json(processedVideos);
});

module.exports = router;