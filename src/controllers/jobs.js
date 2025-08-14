const Job = require('../models/job');

// Get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const userId = req.user?.role === 'admin' ? null : req.user?.id;
    const jobs = await Job.getAll(userId);
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve jobs',
      message: error.message 
    });
  }
};

// Get job by ID
exports.getJobById = async (req, res) => {
  try {
    const userId = req.user?.role === 'admin' ? null : req.user?.id;
    const job = await Job.getById(req.params.id, userId);
    
    if (!job) {
      return res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve job',
      message: error.message 
    });
  }
};

// Create CPU-intensive job
exports.createJob = async (req, res) => {
  try {
    const { 
      title, 
      description = 'CPU-intensive video processing job',
      resolution = '1080p', 
      quality = 'slow', 
      codec = 'h265' 
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        error: 'Job title is required' 
      });
    }
    
    // Create job record
    const jobData = {
      userId: req.user?.id || 1,
      title,
      description,
      inputFilename: `input_${Date.now()}.mp4`,
      resolution,
      quality,
      codec
    };
    
    const job = await Job.create(jobData);
    
    // Start CPU-intensive processing asynchronously
    startCpuIntensiveProcessing(job.id, jobData);
    
    res.status(201).json({
      success: true,
      message: 'CPU-intensive video processing job created successfully',
      data: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: 'pending',
        resolution,
        quality,
        codec,
        estimatedDuration: '5-10 minutes (CPU intensive)',
        note: 'This job will consume significant CPU resources'
      }
    });
    
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create job',
      message: error.message 
    });
  }
};

// Update job
exports.updateJob = async (req, res) => {
  try {
    const { status, progress, error_message, cpu_time_seconds } = req.body;
    const updateData = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'processing') updateData.started_at = new Date();
      if (status === 'completed' || status === 'failed') updateData.completed_at = new Date();
    }
    if (progress !== undefined) updateData.progress = progress;
    if (error_message) updateData.error_message = error_message;
    if (cpu_time_seconds) updateData.cpu_time_seconds = cpu_time_seconds;
    
    const result = await Job.update(req.params.id, updateData);
    
    if (!result.updated) {
      return res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Job updated successfully' 
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update job',
      message: error.message 
    });
  }
};

// Delete job
exports.deleteJob = async (req, res) => {
  try {
    const userId = req.user?.role === 'admin' ? null : req.user?.id;
    const result = await Job.remove(req.params.id, userId);
    
    if (!result.deleted) {
      return res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Job deleted successfully' 
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete job',
      message: error.message 
    });
  }
};

// CPU-intensive processing simulation
async function startCpuIntensiveProcessing(jobId, jobData) {
  try {
    console.log(`Starting CPU-intensive processing for job ${jobId}`);
    
    // Update status to processing
    await Job.update(jobId, { 
      status: 'processing', 
      progress: 10,
      started_at: new Date()
    });
    
    // Run CPU-intensive work for 5+ minutes
    await performCpuIntensiveWork(jobId);
    
    // Mark as completed
    await Job.update(jobId, { 
      status: 'completed', 
      progress: 100,
      completed_at: new Date(),
      output_filename: `output_${jobId}_${Date.now()}.mp4`,
      cpu_time_seconds: 300 // 5 minutes
    });
    
    console.log(`Job ${jobId} completed successfully after CPU-intensive processing`);
    
  } catch (error) {
    console.error(`Job ${jobId} failed during CPU-intensive processing:`, error);
    await Job.update(jobId, { 
      status: 'failed', 
      error_message: error.message,
      completed_at: new Date()
    });
  }
}

// Perform actual CPU-intensive work
function performCpuIntensiveWork(jobId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let progress = 10;
    
    console.log(`Job ${jobId}: Starting CPU-intensive computation`);
    
    // CPU-intensive interval - runs for 5+ minutes
    const interval = setInterval(async () => {
      try {
        // Generate large prime numbers (CPU intensive)
        const primes = generateLargePrimes(50000 + Math.random() * 50000);
        
        // Perform matrix operations (CPU intensive)
        const matrix = performMatrixOperations(1000);
        
        // Calculate complex mathematical functions
        const fibonacci = calculateLargeFibonacci(1000 + Math.random() * 500);
        
        progress += 12;
        const currentProgress = Math.min(progress, 95);
        
        await Job.update(jobId, { 
          progress: currentProgress,
          cpu_time_seconds: Math.floor((Date.now() - startTime) / 1000)
        });
        
        console.log(`Job ${jobId}: Progress ${currentProgress}% - Generated ${primes.length} primes, matrix size ${matrix.length}x${matrix.length}, fibonacci ${fibonacci}`);
        
        // Run for at least 5 minutes to meet CAB432 requirements
        if (Date.now() - startTime > 5 * 60 * 1000) {
          clearInterval(interval);
          resolve();
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 25000); // Update every 25 seconds
  });
}

// CPU-intensive prime number generation
function generateLargePrimes(limit) {
  const primes = [];
  for (let i = 2; i < limit; i++) {
    let isPrime = true;
    const sqrt = Math.sqrt(i);
    for (let j = 2; j <= sqrt; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(i);
  }
  return primes;
}

// CPU-intensive matrix operations
function performMatrixOperations(size) {
  const matrix = [];
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      matrix[i][j] = Math.random() * 100;
    }
  }
  
  // Matrix multiplication (CPU intensive)
  const result = [];
  for (let i = 0; i < size; i++) {
    result[i] = [];
    for (let j = 0; j < size; j++) {
      result[i][j] = 0;
      for (let k = 0; k < size; k++) {
        result[i][j] += matrix[i][k] * matrix[k][j];
      }
    }
  }
  
  return result;
}

// CPU-intensive fibonacci calculation
function calculateLargeFibonacci(n) {
  let a = 0, b = 1, temp;
  for (let i = 2; i <= n; i++) {
    temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}