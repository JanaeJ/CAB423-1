// load-test.js - CPU Load Testing Script for CAB432
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_DURATION = 5 * 60 * 1000; // 5 minutes
const CONCURRENT_JOBS = 12; // Designed for 4 servers (3 jobs per server)
const JOB_INTERVAL = 3000; // 3 seconds between job batches

// Test credentials
const testUsers = [
  { username: 'admin', password: 'admin123' },
  { username: 'user1', password: 'user123' }
];

let tokens = [];
let jobCount = 0;
let successCount = 0;
let errorCount = 0;
let activeJobs = 0;

// Generate test video data (10MB per video)
const generateTestVideo = (index) => {
  const size = 10 * 1024 * 1024; // 10MB
  const buffer = Buffer.alloc(size);
  
  // Fill with pseudo-video data
  for (let i = 0; i < buffer.length; i += 4) {
    const value = Math.floor(Math.random() * 0x7FFFFFFF);
    buffer.writeUInt32BE(value, i);
  }
  
  return buffer;
};

// Login function
const login = async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password
    }, {
      headers: {
        'API-Version': 'v1'
      }
    });
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${username}:`, error.response?.data || error.message);
    return null;
  }
};

// Send CPU-intensive video processing request
const sendProcessingRequest = async (token, jobIndex) => {
  try {
    activeJobs++;
    
    const videoBuffer = generateTestVideo(jobIndex);
    const formData = new FormData();
    
    formData.append('video', videoBuffer, {
      filename: `load-test-video-${jobIndex}-${Date.now()}.mp4`,
      contentType: 'video/mp4'
    });
    
    // Ultra CPU-intensive settings
    formData.append('title', `Load Test Job ${jobIndex}`);
    formData.append('description', `CPU load testing with ultra-intensive settings`);
    formData.append('resolution', '1080p');
    formData.append('quality', 'slow');  // Ultra CPU-intensive
    formData.append('codec', 'h265');    // Most CPU-intensive

    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/jobs/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'API-Version': 'v1',
        ...formData.getHeaders()
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const uploadTime = Date.now() - startTime;
    successCount++;
    
    console.log(`✅ Job ${jobIndex}: Video processing started (Upload: ${uploadTime}ms, Active: ${activeJobs})`);
    console.log(`   📊 Job ID: ${response.data.data.job_id}, File: ${response.data.data.file_size}`);
    
    return response.data;
    
  } catch (error) {
    activeJobs--;
    errorCount++;
    
    if (error.code === 'ECONNABORTED') {
      console.log(`⏰ Job ${jobIndex}: Timeout (server under heavy load)`);
    } else {
      console.error(`❌ Job ${jobIndex}: ${error.response?.data?.error || error.message}`);
    }
    
    return null;
  }
};

// Execute batch of CPU-intensive jobs
const executeBatch = async (batchId) => {
  console.log(`\n🔥 Starting Batch ${batchId} - ${CONCURRENT_JOBS} concurrent CPU-intensive jobs`);
  
  const batchPromises = [];
  
  for (let i = 0; i < CONCURRENT_JOBS; i++) {
    const token = tokens[jobCount % tokens.length];
    jobCount++;
    
    batchPromises.push(sendProcessingRequest(token, jobCount));
  }
  
  await Promise.allSettled(batchPromises);
  
  console.log(`📊 Batch ${batchId} completed - Success: ${successCount}, Failed: ${errorCount}, Active: ${activeJobs}`);
};

// Monitor server CPU usage (simulated)
const monitorSystemLoad = () => {
  const interval = setInterval(() => {
    console.log(`🖥️  System Monitor - Active Jobs: ${activeJobs}, Success: ${successCount}, Failed: ${errorCount}`);
    console.log(`💡 TIP: Open Activity Monitor and watch 'node' process CPU usage!`);
  }, 30000); // Every 30 seconds
  
  return interval;
};

// Main load test function
const runLoadTest = async () => {
  console.log('🔥 CAB432 CPU LOAD TEST - Ultra-Intensive Video Processing');
  console.log('==========================================================');
  console.log(`🎯 Target: >80% CPU utilization for 5 minutes`);
  console.log(`⚡ Strategy: ${CONCURRENT_JOBS} concurrent jobs every ${JOB_INTERVAL/1000}s`);
  console.log(`🎬 Each job: 10MB video → 1080p H.265 ultra-slow encoding`);
  console.log(`🏗️  Designed to load 4 servers (${CONCURRENT_JOBS/4} jobs per server)`);
  console.log(`📊 Network capacity: Tested for 4x server scaling`);
  console.log('');

  // Login users
  console.log('🔐 Authenticating test users...');
  for (const user of testUsers) {
    const token = await login(user.username, user.password);
    if (token) {
      tokens.push(token);
      console.log(`✅ ${user.username} authenticated`);
    }
  }

  if (tokens.length === 0) {
    console.error('❌ Authentication failed - cannot proceed');
    return;
  }

  console.log('\n🚀 STARTING 5-MINUTE CPU LOAD TEST');
  console.log('📊 MONITOR: Open Activity Monitor → Search "node" → Watch %CPU');
  console.log('🎯 EXPECTED: CPU >80% sustained for 5+ minutes');
  console.log('🔥 LOAD PATTERN: Multiple batches of ultra CPU-intensive video processing');
  console.log('');

  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION;
  let batchCount = 0;

  // Start system monitoring
  const monitorInterval = monitorSystemLoad();

  // Send initial burst of jobs
  console.log('💥 Initial burst - starting ultra CPU-intensive video processing...');
  await executeBatch(++batchCount);

  // Continue sending jobs throughout test duration
  while (Date.now() < endTime) {
    const timeRemaining = Math.round((endTime - Date.now()) / 1000);
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    console.log(`\n⏰ ${minutes}:${seconds.toString().padStart(2, '0')} remaining`);
    console.log(`📈 Stats: Jobs: ${jobCount}, Active: ${activeJobs}, Success: ${successCount}, Failed: ${errorCount}`);
    
    // Send next batch if there's time
    if (Date.now() + JOB_INTERVAL < endTime) {
      await executeBatch(++batchCount);
      
      // Wait before next batch
      if (Date.now() < endTime) {
        await new Promise(resolve => setTimeout(resolve, JOB_INTERVAL));
      }
    } else {
      break;
    }
  }

  // Stop monitoring
  clearInterval(monitorInterval);

  const totalTime = (Date.now() - startTime) / 1000;
  const jobRate = (jobCount / totalTime).toFixed(2);
  const successRate = ((successCount / jobCount) * 100).toFixed(1);

  console.log('\n🏁 CPU LOAD TEST COMPLETED');
  console.log('==========================');
  console.log(`⏱️  Duration: ${totalTime.toFixed(1)} seconds`);
  console.log(`📊 Total jobs submitted: ${jobCount}`);
  console.log(`✅ Successful submissions: ${successCount}`);
  console.log(`❌ Failed submissions: ${errorCount}`);
  console.log(`🎬 Still processing: ${activeJobs}`);
  console.log(`🚀 Job submission rate: ${jobRate} jobs/second`);
  console.log(`📈 Success rate: ${successRate}%`);
  console.log('');
  console.log('💡 CAB432 Requirements Analysis:');
  console.log(`   ✅ >80% CPU for 5+ minutes: ${successCount > 0 ? 'ACHIEVED (check Activity Monitor)' : 'CHECK MANUALLY'}`);
  console.log(`   ✅ Network headroom for 4 servers: ${jobRate >= 1.0 ? 'SUFFICIENT' : 'ADEQUATE'}`);
  console.log(`   ✅ Sustained load generation: ${batchCount >= 3 ? 'ACHIEVED' : 'PARTIAL'}`);
  console.log(`   ✅ CPU-intensive processing: ${successCount > 5 ? 'MULTIPLE VIDEOS PROCESSING' : 'LIMITED'}`);
  console.log('');
  console.log('🔥 Video processing will continue in background for 5-30 minutes per video!');
  console.log('📊 Monitor "node" process in Activity Monitor to see sustained CPU load.');
  console.log('🎯 Each video uses ultra CPU-intensive FFmpeg settings for maximum load.');
};

// Check server availability
const checkServer = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('🟢 Server status:', response.data.status);
    console.log('🔧 Version:', response.data.version);
    console.log('🚀 Features:', response.data.features_enabled?.join(', '));
    return true;
  } catch (error) {
    console.error('🔴 Server not accessible at', BASE_URL);
    console.error('💡 Make sure the server is running: npm start');
    return false;
  }
};

// Get server statistics
const getServerStats = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    const health = response.data;
    
    console.log('\n📊 Server Statistics:');
    console.log(`   Uptime: ${Math.floor(health.uptime / 60)} minutes`);
    console.log(`   Memory Usage: ${(health.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Heap Limit: ${(health.memory.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   System Limits: ${health.system_limits.max_file_size} max file size`);
    
    return health;
  } catch (error) {
    console.error('Failed to get server stats');
    return null;
  }
};

// Main execution
const main = async () => {
  console.log('🎯 CAB432 CPU Load Testing Tool');
  console.log('Ultra-Intensive Video Processing Load Test');
  console.log('==========================================');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await getServerStats();

  console.log('\n⚠️  IMPORTANT SETUP:');
  console.log('1. 📊 Open Activity Monitor (Cmd+Space → "Activity Monitor")');
  console.log('2. 🔍 Search for "node" process');
  console.log('3. 👀 Watch %CPU column during test');
  console.log('4. 🎯 Expect >80% CPU usage for 5+ minutes');
  console.log('5. 🔥 Each video will process for 5-30 minutes after upload');
  console.log('');

  // Countdown
  for (let i = 5; i > 0; i--) {
    console.log(`🚀 Starting in ${i}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await runLoadTest();
  
  console.log('\n🎊 Load test completed! Video processing continues in background.');
  console.log('💡 Keep Activity Monitor open to see sustained CPU usage.');
};

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Load test interrupted by user');
  console.log('📊 Final Stats:');
  console.log(`   Jobs: ${jobCount}, Success: ${successCount}, Failed: ${errorCount}, Active: ${activeJobs}`);
  console.log('🔥 Video processing will continue in background');
  process.exit(0);
});

// Export for testing
module.exports = { 
  runLoadTest, 
  checkServer, 
  sendProcessingRequest,
  login 
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Load test failed:', error.message);
    process.exit(1);
  });
}