const Job = require('../models/job');
const { transcodeVideo } = require('../services/videoProcessor');

exports.getAllJobs = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const jobs = await Job.getAll(userId);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const job = await Job.getById(req.params.id, userId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createJob = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const { resolution = '720p', quality = 'medium', codec = 'h264' } = req.body;
    
    // 创建作业记录
    const jobData = {
      userId: req.user.id,
      originalName: req.file.originalname,
      inputPath: req.file.path,
      resolution,
      quality,
      codec
    };
    
    const job = await Job.create(jobData);
    
    // 异步开始处理（CPU密集任务）
    processVideoJob(job.id, jobData);
    
    res.status(201).json({
      message: 'Video processing job created successfully',
      job: {
        id: job.id,
        originalName: job.originalName,
        status: 'pending',
        resolution,
        quality,
        codec
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { status, progress, error_message } = req.body;
    const updateData = {};
    
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (error_message) updateData.error_message = error_message;
    if (status === 'completed') updateData.completed_at = new Date();
    
    const result = await Job.update(req.params.id, updateData);
    
    if (!result.updated) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const result = await Job.remove(req.params.id, userId);
    
    if (!result.deleted) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CPU密集视频处理函数
async function processVideoJob(jobId, jobData) {
  try {
    await Job.update(jobId, { status: 'processing' });
    
    // 执行CPU密集的视频转码
    const outputPath = `./processed/job_${jobId}_${Date.now()}.mp4`;
    await transcodeVideo(jobData.inputPath, outputPath, {
      resolution: jobData.resolution,
      quality: jobData.quality,
      codec: jobData.codec
    });
    
    await Job.update(jobId, { 
      status: 'completed', 
      output_path: outputPath,
      progress: 100,
      completed_at: new Date()
    });
    
  } catch (error) {
    await Job.update(jobId, { 
      status: 'failed', 
      error_message: error.message 
    });
  }
}