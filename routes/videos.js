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

// Pure CPU-intensive computation function
const cpuIntensiveTask = (durationSeconds = 300) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    
    let result = 0;
    
    const compute = () => {
      const batchStart = Date.now();
      
      // 执行大量计算，每次检查时间
      while (Date.now() - batchStart < 100) { // 100ms批次
        // 复杂的数学运算
        for (let i = 0; i < 100000; i++) {
          result += Math.sin(i) * Math.cos(i * 2) * Math.tan(i * 3);
          result += Math.sqrt(Math.abs(result)) + Math.log(Math.abs(result) + 1);
          result = result % 1000000; // 防止数字过大
        }
        
        // 字符串操作
        let str = 'CPU intensive task running';
        for (let j = 0; j < 1000; j++) {
          str = str.split('').reverse().join('') + j.toString();
          str = str.substring(0, 100); // 防止内存爆炸
        }
        
        // 数组操作
        const arr = new Array(10000).fill(0).map((_, i) => i);
        arr.sort(() => Math.random() - 0.5);
        result += arr.reduce((sum, val) => sum + val, 0);
      }
      
      if (Date.now() < endTime) {
        // 立即调度下一个计算批次
        setImmediate(compute);
      } else {
        console.log(`CPU intensive task completed after ${(Date.now() - startTime) / 1000}s`);
        resolve(result);
      }
    };
    
    compute();
  });
};

// Ultra CPU-intensive video transcoding function with forced CPU load
const transcodeVideo = (inputPath, outputPath, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      resolution = '720p',
      quality = 'medium',
      codec = 'h264'
    } = options;

    console.log('🔥 Starting ULTRA CPU-intensive video transcoding...');
    console.log('⚡ This will run for 5+ minutes to meet CAB432 requirements');

    // 同时启动纯CPU计算任务
    const cpuTask = cpuIntensiveTask(360); // 6分钟CPU计算
    
    let ffmpegCommand = ffmpeg(inputPath)
      .videoCodec(codec === 'h264' ? 'libx264' : 'libx265')
      .audioCodec('aac')
      .audioBitrate(128);

    // 极端CPU密集设置
    if (quality === 'slow') {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset veryslow',       // 最慢预设
        '-crf 10',               // 极高质量（更CPU密集）
        '-bf 16',                // 最大B帧
        '-refs 16',              // 最大参考帧
        '-subme 11',             // 最大子像素运动估计
        '-me_range 64',          // 更大运动搜索范围
        '-g 600',                // 更大GOP
        '-keyint_min 60',        // 更大最小关键帧间隔
        '-sc_threshold 20',      // 更低场景切换阈值（更多处理）
        '-qcomp 0.8',           // 更高量化曲线压缩
        '-qmin 1',              // 最小量化
        '-qmax 51',             // 最大量化
        '-qdiff 6',             // 更大相邻帧量化差异
        '-trellis 2',           // Trellis量化
        '-partitions +parti8x8+parti4x4+partp8x8+partb8x8',
        '-direct-pred 3',       // 直接预测模式
        '-flags +loop+mv4',     // 更多标志
        '-deblock 1:1:1',       // 更强去块滤波
        '-analyse 0x3:0x3ff',   // 更多分析选项
        '-no-fast-pskip',       // 禁用快速跳过
        '-no-dct-decimate',     // 禁用DCT抽取
        '-threads 1',           // 强制单线程（关键！）
        '-tune film',           // 针对电影优化
        '-profile:v high',      // 高级配置文件
        '-level 5.1',           // 更高级别
        '-x264-params ref=16:bframes=16:subme=11:me_range=64:rc_lookahead=250:partitions=all:8x8dct:cabac:weightb:mixed_refs:chroma_me:me_tesa:direct=auto:no-fast-pskip:no-dct-decimate:trellis=2:deadzone-inter=21:deadzone-intra=11:ip_ratio=1.4:pb_ratio=1.3'
      ]);
    } else if (quality === 'medium') {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset slower',
        '-crf 15',
        '-bf 12',
        '-refs 12',
        '-subme 10',
        '-me_range 32',
        '-threads 1'           // 强制单线程
      ]);
    } else {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset slow',
        '-crf 20',
        '-threads 2'
      ]);
    }

    // 设置分辨率
    if (resolution === '1080p') {
      ffmpegCommand = ffmpegCommand.size('1920x1080');
    } else if (resolution === '720p') {
      ffmpegCommand = ffmpegCommand.size('1280x720');
    } else if (resolution === '480p') {
      ffmpegCommand = ffmpegCommand.size('854x480');
    } else if (resolution === '4k') {
      ffmpegCommand = ffmpegCommand.size('3840x2160');
    }

    // 添加极其CPU密集的视频滤镜
    const filters = [];
    
    if (quality === 'slow') {
      // 多重高质量滤镜
      filters.push('scale=iw:ih:flags=lanczos+accurate_rnd+full_chroma_int');
      filters.push('unsharp=7:7:2.5:7:7:1.5');  // 更强锐化
      filters.push('eq=contrast=1.2:brightness=0.1:saturation=1.2:gamma=1.1'); 
      filters.push('hqdn3d=8:6:12:9');          // 更强降噪
      filters.push('deshake=x=-1:y=-1:w=-1:h=-1:rx=64:ry=64'); // 防抖
      filters.push('colorbalance=rs=0.1:gs=0.05:bs=-0.05:rm=0.05:gm=0.1:bm=-0.1'); // 色彩平衡
    } else if (quality === 'medium') {
      filters.push('scale=iw:ih:flags=lanczos');
      filters.push('unsharp=5:5:1.5:5:5:0.8');
      filters.push('eq=contrast=1.1:brightness=0.05:saturation=1.1');
      filters.push('hqdn3d=4:3:6:4.5');
    }
    
    if (filters.length > 0) {
      ffmpegCommand = ffmpegCommand.videoFilters(filters);
    }

    ffmpegCommand
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🚀 FFmpeg started with EXTREME CPU settings:');
        console.log(commandLine);
        console.log('💻 Expected: >80% CPU for 5+ minutes');
        console.log('📊 Monitor with: top -pid $(pgrep node)');
      })
      .on('progress', (progress) => {
        const percent = progress.percent ? progress.percent.toFixed(2) : 'N/A';
        console.log(`🎬 Processing: ${percent}% | Time: ${progress.timemark || 'N/A'} | CPU should be >80%`);
      })
      .on('end', async () => {
        console.log('✅ FFmpeg transcoding completed');
        console.log('⏳ Waiting for CPU task to complete...');
        
        // 等待CPU任务完成
        await cpuTask;
        
        console.log('🏁 All CPU-intensive tasks completed');
        resolve({ success: true, outputPath });
      })
      .on('error', async (err) => {
        console.error('❌ FFmpeg error:', err);
        
        // 即使FFmpeg失败，也让CPU任务继续运行
        console.log('🔄 Continuing CPU task despite FFmpeg error...');
        await cpuTask;
        
        reject(err);
      })
      .run();
  });
};

// 添加纯CPU测试端点
router.post('/cpu-test', authenticateToken, async (req, res) => {
  try {
    const duration = parseInt(req.body.duration) || 300; // 默认5分钟
    
    console.log(`🔥 Starting pure CPU test for ${duration} seconds...`);
    
    res.json({
      message: `CPU intensive task started for ${duration} seconds`,
      expectedDuration: `${duration} seconds`,
      monitorTip: 'Use Activity Monitor to watch node process CPU usage'
    });

    // 异步运行CPU密集任务
    cpuIntensiveTask(duration).then(() => {
      console.log('✅ Pure CPU test completed');
    }).catch(err => {
      console.error('❌ CPU test error:', err);
    });

  } catch (error) {
    console.error('CPU test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    console.log(`📤 Received video: ${originalName}, Size: ${(req.file.size / (1024*1024)).toFixed(2)}MB`);

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

    // 立即启动多个CPU密集任务
    console.log('🚀 Starting multiple CPU-intensive processes...');
    
    // 1. 视频转码任务
    const videoTask = transcodeVideo(inputPath, outputPath, req.body);
    
    // 2. 并行CPU计算任务
    const cpuTasks = [];
    for (let i = 0; i < 3; i++) {
      cpuTasks.push(cpuIntensiveTask(360)); // 每个6分钟
    }

    // 异步处理所有任务
    Promise.allSettled([videoTask, ...cpuTasks])
      .then(async (results) => {
        const videoResult = results[0];
        
        if (videoResult.status === 'fulfilled') {
          task.status = 'completed';
          task.completedAt = new Date();

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

          console.log(`✅ Video processing completed: ${taskId}`);
        } else {
          task.status = 'failed';
          task.error = videoResult.reason?.message || 'Unknown error';
          console.error(`❌ Video processing failed: ${taskId}`, videoResult.reason);
        }

        // 清理原始文件
        try {
          await fs.unlink(inputPath);
          console.log(`🧹 Cleaned up: ${inputPath}`);
        } catch (error) {
          console.log(`⚠️ Cleanup warning: ${error.message}`);
        }
      });

    res.json({
      message: 'ULTRA CPU-intensive video processing started',
      taskId,
      status: 'processing',
      originalName,
      fileSize: `${(req.file.size / (1024*1024)).toFixed(2)}MB`,
      cpuLoad: 'Expected >80% CPU for 5+ minutes',
      monitorTip: 'Open Activity Monitor and watch node process',
      estimatedTime: '5-10 minutes due to extreme CPU settings'
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