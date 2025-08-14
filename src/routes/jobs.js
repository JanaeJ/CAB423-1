// src/routes/jobs.js - Integrated: Advanced API + Real Video Processing
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const pool = require('../db');

// Configure multer for video uploads (up to 1GB)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
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
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed'), false);
    }
  }
});

// Ensure directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const processedDir = path.join(__dirname, '../../processed');

(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });
    console.log('Upload and processed directories created');
  } catch (error) {
    console.error('Failed to create directories:', error);
  }
})();

// API Version middleware
const apiVersion = (req, res, next) => {
  const version = req.headers['api-version'] || req.query.version || 'v1';
  req.apiVersion = version;
  res.setHeader('API-Version', version);
  next();
};

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    });
  }
  
  // Simplified JWT verification for demo
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'cab432-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token',
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    });
  }
};

// Ultra CPU-intensive video processing function
const processVideoFile = (inputPath, outputPath, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      resolution = '720p',
      quality = 'medium',
      codec = 'h264'
    } = options;

    console.log(`Starting ULTRA CPU-intensive video processing: ${inputPath}`);
    
    let ffmpegCommand = ffmpeg(inputPath)
      .videoCodec(codec === 'h264' ? 'libx264' : 'libx265')
      .audioCodec('aac')
      .audioBitrate(128);

    // Ultra CPU-intensive settings based on quality
    if (quality === 'slow') {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset veryslow',        // Slowest preset
        '-crf 15',                // Very high quality
        '-bf 16',                 // Max B-frames
        '-refs 16',               // Max reference frames
        '-subme 11',              // Max subpixel motion estimation
        '-me_range 32',           // Max motion search range
        '-g 300',                 // Large GOP
        '-keyint_min 30',         // Min keyframe interval
        '-sc_threshold 40',       // Scene change threshold
        '-qcomp 0.6',            // Quantizer curve compression
        '-qmin 1',               // Min quantizer (very high quality)
        '-qmax 51',              // Max quantizer
        '-qdiff 4',              // Adjacent frame quantizer difference
        '-trellis 2',            // Trellis quantization
        '-partitions +parti8x8+parti4x4+partp8x8+partb8x8',
        '-direct-pred 3',        // Direct prediction mode
        '-flags +loop',          // Loop filter
        '-deblock 1:0:0',        // Deblocking filter
        '-analyse 0x3:0x113',    // Analysis options
        '-no-fast-pskip',        // Disable fast P-skip
        '-no-dct-decimate',      // Disable DCT decimation
        '-threads 1'             // Force single thread for max CPU usage
      ]);
    } else if (quality === 'medium') {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset slower',
        '-crf 18',
        '-bf 8',
        '-refs 8',
        '-subme 9',
        '-me_range 16',
        '-threads 2'
      ]);
    } else {
      ffmpegCommand = ffmpegCommand.outputOptions([
        '-preset slow',
        '-crf 23',
        '-threads 4'
      ]);
    }

    // Set resolution
    const resolutionMap = {
      '480p': '854x480',
      '720p': '1280x720',
      '1080p': '1920x1080',
      '4k': '3840x2160'
    };
    
    if (resolutionMap[resolution]) {
      ffmpegCommand = ffmpegCommand.size(resolutionMap[resolution]);
    }

    // Add CPU-intensive video filters
    const filters = [
      'scale=iw:ih:flags=lanczos',  // High-quality scaling
      'unsharp=5:5:1.0:5:5:0.0',    // Sharpening filter
      'eq=contrast=1.1:brightness=0.05:saturation=1.1', // Color adjustment
    ];
    
    if (quality === 'slow') {
      filters.push('hqdn3d=4:3:6:4.5'); // High quality denoise
    }
    
    ffmpegCommand = ffmpegCommand.videoFilters(filters);

    const startTime = Date.now();
    
    ffmpegCommand
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg started with ULTRA CPU-intensive settings:');
        console.log(commandLine);
      })
      .on('progress', (progress) => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`Processing: ${progress.percent ? progress.percent.toFixed(2) : 'N/A'}% - Elapsed: ${elapsed}s`);
      })
      .on('end', () => {
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`ULTRA CPU-intensive processing completed in ${totalTime} seconds`);
        resolve({ success: true, outputPath, processingTime: totalTime });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
};

// Enhanced GET /jobs with pagination, filtering, sorting
router.get('/', apiVersion, authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'desc',
      status,
      title,
      resolution,
      quality,
      codec
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = ['id', 'title', 'status', 'created_at', 'started_at', 'completed_at', 'progress'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

    let whereConditions = [];
    let queryParams = [];

    if (req.user.role !== 'admin') {
      whereConditions.push(`user_id = ?`);
      queryParams.push(req.user.id);
    }

    if (status) {
      whereConditions.push(`status = ?`);
      queryParams.push(status);
    }

    if (title) {
      whereConditions.push(`title LIKE ?`);
      queryParams.push(`%${title}%`);
    }

    if (resolution) {
      whereConditions.push(`resolution = ?`);
      queryParams.push(resolution);
    }

    if (quality) {
      whereConditions.push(`quality = ?`);
      queryParams.push(quality);
    }

    if (codec) {
      whereConditions.push(`codec = ?`);
      queryParams.push(codec);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM video_jobs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = Number(countResult[0].total); // Fix BigInt issue

    const totalPages = Math.ceil(totalItems / limitNum);

    // Main query
    const dataQuery = `
      SELECT 
        id, user_id, title, description, status, 
        input_filename, output_filename,
        resolution, quality, codec, progress, 
        cpu_time_seconds, created_at, started_at, completed_at,
        error_message
      FROM video_jobs 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const jobs = await pool.query(dataQuery, [...queryParams, limitNum, offset]);

    const response = {
      success: true,
      data: jobs,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_items: totalItems,
        total_pages: totalPages,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1,
        next_page: pageNum < totalPages ? pageNum + 1 : null,
        prev_page: pageNum > 1 ? pageNum - 1 : null
      },
      filters_applied: {
        status: status || null,
        title_search: title || null,
        resolution: resolution || null,
        quality: quality || null,
        codec: codec || null
      },
      sorting: {
        field: sortField,
        order: sortOrder.toLowerCase()
      },
      meta: {
        api_version: req.apiVersion,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || `req_${Date.now()}`
      }
    };

    // Add HATEOAS links
    if (req.apiVersion === 'v1') {
      response.links = {
        self: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        create: `${req.protocol}://${req.get('host')}/jobs`,
        upload: `${req.protocol}://${req.get('host')}/jobs/upload`
      };
    }

    res.setHeader('X-Total-Count', totalItems);
    res.setHeader('X-Total-Pages', totalPages);
    res.json(response);

  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      api_version: req.apiVersion,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /jobs - Create job (without file)
router.post('/', apiVersion, authenticateToken, async (req, res) => {
  try {
    const { title, description, resolution, quality, codec } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: { title: 'Title is required' },
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    const insertQuery = `
      INSERT INTO video_jobs 
      (user_id, title, description, resolution, quality, codec, status, progress, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NOW())
    `;

    const result = await pool.query(insertQuery, [
      req.user.id,
      title.trim(),
      description || '',
      resolution || '720p',
      quality || 'medium',
      codec || 'h264'
    ]);

    const newJobId = result.insertId;
    const createdJob = await pool.query('SELECT * FROM video_jobs WHERE id = ?', [newJobId]);

    const response = {
      success: true,
      message: 'Job created successfully (no file uploaded)',
      data: createdJob[0],
      meta: {
        api_version: req.apiVersion,
        timestamp: new Date().toISOString(),
        note: 'Use /jobs/upload to upload and process video files'
      }
    };

    if (req.apiVersion === 'v1') {
      response.links = {
        self: `${req.protocol}://${req.get('host')}/jobs/${newJobId}`,
        upload: `${req.protocol}://${req.get('host')}/jobs/upload`,
        all_jobs: `${req.protocol}://${req.get('host')}/jobs`
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      api_version: req.apiVersion,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /jobs/upload - Upload and process video (CPU INTENSIVE)
router.post('/upload', apiVersion, authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded',
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    const { title, description, resolution, quality, codec } = req.body;
    const jobTitle = title || `Video Processing: ${req.file.originalname}`;
    
    // Create job record
    const insertQuery = `
      INSERT INTO video_jobs 
      (user_id, title, description, input_filename, resolution, quality, codec, status, progress, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', 0, NOW())
    `;

    const result = await pool.query(insertQuery, [
      req.user.id,
      jobTitle,
      description || `CPU-intensive processing of ${req.file.originalname}`,
      req.file.originalname,
      resolution || '720p',
      quality || 'medium',
      codec || 'h264'
    ]);

    const jobId = result.insertId;
    const inputPath = req.file.path;
    const outputFileName = `processed_${jobId}_${Date.now()}.mp4`;
    const outputPath = path.join(processedDir, outputFileName);

    console.log(`Starting CPU-intensive video processing for job ${jobId}`);

    // Update job status
    await pool.query(
      'UPDATE video_jobs SET started_at = NOW(), status = "processing" WHERE id = ?',
      [jobId]
    );

    // Start CPU-intensive processing asynchronously
    processVideoFile(inputPath, outputPath, { resolution, quality, codec })
      .then(async (result) => {
        await pool.query(
          'UPDATE video_jobs SET status = "completed", progress = 100, completed_at = NOW(), output_filename = ?, cpu_time_seconds = ? WHERE id = ?',
          [outputFileName, result.processingTime, jobId]
        );
        
        // Clean up input file
        try {
          await fs.unlink(inputPath);
          console.log(`Cleaned up input file: ${inputPath}`);
        } catch (error) {
          console.log(`Failed to cleanup: ${error.message}`);
        }
        
        console.log(`Job ${jobId} completed successfully`);
      })
      .catch(async (error) => {
        await pool.query(
          'UPDATE video_jobs SET status = "failed", error_message = ? WHERE id = ?',
          [error.message, jobId]
        );
        
        try {
          await fs.unlink(inputPath);
        } catch (e) {
          console.log(`Cleanup error: ${e.message}`);
        }
        
        console.error(`Job ${jobId} failed:`, error);
      });

    const response = {
      success: true,
      message: 'Video uploaded and CPU-intensive processing started',
      data: {
        job_id: jobId,
        title: jobTitle,
        input_file: req.file.originalname,
        file_size: `${(req.file.size / (1024*1024)).toFixed(2)}MB`,
        settings: { resolution, quality, codec },
        status: 'processing'
      },
      meta: {
        api_version: req.apiVersion,
        timestamp: new Date().toISOString(),
        estimated_time: quality === 'slow' ? '10-30 minutes' : '5-15 minutes',
        cpu_note: 'This will generate significant CPU load for 5+ minutes'
      }
    };

    if (req.apiVersion === 'v1') {
      response.links = {
        job_status: `${req.protocol}://${req.get('host')}/jobs/${jobId}`,
        all_jobs: `${req.protocol}://${req.get('host')}/jobs`
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      api_version: req.apiVersion,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /jobs/:id - Get specific job
router.get('/:id', apiVersion, authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    
    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job ID',
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    const jobs = await pool.query('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    const job = jobs[0];
    
    if (job.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: true,
      data: job,
      meta: {
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      }
    };

    if (req.apiVersion === 'v1') {
      response.links = {
        self: `${req.protocol}://${req.get('host')}/jobs/${jobId}`,
        all_jobs: `${req.protocol}://${req.get('host')}/jobs`
      };
      
      if (job.status === 'completed' && job.output_filename) {
        response.links.download = `${req.protocol}://${req.get('host')}/jobs/${jobId}/download`;
      }
    }

    res.json(response);

  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      api_version: req.apiVersion,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /jobs/:id/download - Download processed video
router.get('/:id/download', apiVersion, authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const jobs = await pool.query('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
    
    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobs[0];
    
    if (job.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== 'completed' || !job.output_filename) {
      return res.status(400).json({ error: 'Video not ready for download' });
    }

    const filePath = path.join(processedDir, job.output_filename);
    
    try {
      await fs.access(filePath);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${job.output_filename}"`);
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      res.status(404).json({ error: 'Processed video file not found' });
    }

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /jobs/:id - Delete job
router.delete('/:id', apiVersion, authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const jobs = await pool.query('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    const job = jobs[0];
    
    if (job.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      });
    }

    // Clean up files
    if (job.output_filename) {
      try {
        const outputPath = path.join(processedDir, job.output_filename);
        await fs.unlink(outputPath);
      } catch (error) {
        console.log(`Failed to delete output file: ${error.message}`);
      }
    }

    await pool.query('DELETE FROM video_jobs WHERE id = ?', [jobId]);

    res.json({
      success: true,
      message: 'Job deleted successfully',
      meta: {
        api_version: req.apiVersion,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      api_version: req.apiVersion,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;