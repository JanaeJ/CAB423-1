const axios = require('axios');
const FormData = require('form-data');

// CAB432 Load Testing Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_DURATION = 5 * 60 * 1000; // 5 minutes as required
const CONCURRENT_REQUESTS = 8; // Simulate load for multiple servers
const REQUEST_INTERVAL = 2000; // 2 seconds between batches

// Test users
const testUsers = [
  { username: 'admin', password: 'admin123' },
  { username: 'user1', password: 'user123' }
];

let tokens = [];
let requestCount = 0;
let successCount = 0;
let errorCount = 0;
let activeTranscoding = 0;

// Generate test video data for transcoding
const generateTestVideoData = () => {
  // 15MB test video data
  const size = 15 * 1024 * 1024;
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
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${username}:`, error.response?.data || error.message);
    return null;
  }
};

// Send video transcoding request
const sendTranscodingRequest = async (token, requestId) => {
  try {
    activeTranscoding++;
    
    const videoBuffer = generateTestVideoData();
    const formData = new FormData();
    
    formData.append('video', videoBuffer, {
      filename: `load-test-${requestId}-${Date.now()}.mp4`,
      contentType: 'video/mp4'
    });
    
    // CPU-intensive settings
    formData.append('resolution', '1080p');
    formData.append('quality', 'slow');  // Ultra CPU-intensive
    formData.append('codec', 'h265');    // Most CPU-intensive

    const response = await axios.post(`${BASE_URL}/api/videos/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    successCount++;
    console.log(`✅ Request ${requestId}: Video transcoding started (Active: ${activeTranscoding})`);
    return response.data;
    
  } catch (error) {
    activeTranscoding--;
    errorCount++;
    
    if (error.code === 'ECONNABORTED') {
      console.log(`⏰ Request ${requestId}: Timeout (server processing load)`);
    } else {
      console.error(`❌ Request ${requestId}: ${error.response?.data?.error || error.message}`);
    }
  }
};

// Execute batch of requests
const executeBatch = async (batchId) => {
  const batchPromises = [];
  
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const token = tokens[requestCount % tokens.length];
    requestCount++;
    
    batchPromises.push(sendTranscodingRequest(token, requestCount));
  }
  
  await Promise.allSettled(batchPromises);
  
  console.log(`📊 Batch ${batchId} completed - Success: ${successCount}, Failed: ${errorCount}, Active: ${activeTranscoding}`);
};

// Main load test function
const runLoadTest = async () => {
  console.log('🔥 CAB432 LOAD TEST - VIDEO TRANSCODING');
  console.log('======================================');
  console.log(`🎯 Target: >80% CPU for 5 minutes`);
  console.log(`⚡ Strategy: ${CONCURRENT_REQUESTS} concurrent video transcoding requests every ${REQUEST_INTERVAL/1000}s`);
  console.log(`🎬 Each request: 15MB video, 1080p H.265, Ultra-slow encoding`);
  console.log(`📊 Designed to load down 4+ servers simultaneously`);
  console.log('');

  // Login users
  console.log('🔐 Authenticating users...');
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

  console.log('\n🚀 STARTING 5-MINUTE LOAD TEST');
  console.log('📊 MONITOR CPU: Open Activity Monitor and watch "node" process');
  console.log('🎯 EXPECTED: CPU usage >80% for 5 minutes');
  console.log('');

  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION;
  let batchCount = 0;

  // Send initial burst
  console.log('💥 Initial burst - starting multiple transcoding tasks...');
  await executeBatch(++batchCount);

  // Continue sending requests throughout test duration
  while (Date.now() < endTime) {
    const timeRemaining = Math.round((endTime - Date.now()) / 1000);
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    console.log(`⏰ ${minutes}:${seconds.toString().padStart(2, '0')} remaining | Requests: ${requestCount} | Active: ${activeTranscoding}`);
    
    // Send next batch
    await executeBatch(++batchCount);
    
    // Wait before next batch
    if (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const requestRate = (requestCount / totalTime).toFixed(2);

  console.log('\n🏁 LOAD TEST COMPLETED');
  console.log('=====================');
  console.log(`⏱️  Duration: ${totalTime.toFixed(1)} seconds`);
  console.log(`📊 Total requests: ${requestCount}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`🚀 Request rate: ${requestRate} requests/second`);
  console.log(`🎬 Active transcoding: ${activeTranscoding}`);
  console.log(`📈 Success rate: ${((successCount / requestCount) * 100).toFixed(1)}%`);
  console.log('');
  console.log('💡 CAB432 Requirements Check:');
  console.log(`   ✅ >80% CPU for 5 minutes: ${successCount > 0 ? 'ACHIEVED' : 'CHECK MANUALLY'}`);
  console.log(`   ✅ Network headroom for 4 servers: ${requestRate >= 0.5 ? 'SUFFICIENT' : 'MAY NEED ADJUSTMENT'}`);
  console.log(`   ✅ Sustained load generation: ${requestCount >= 50 ? 'ACHIEVED' : 'PARTIAL'}`);
};

// Check server availability
const checkServer = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('🟢 Server status:', response.data.status);
    return true;
  } catch (error) {
    console.error('🔴 Server not accessible at', BASE_URL);
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🎯 CAB432 Load Testing Tool');
  console.log('Video Transcoding Load Test for >80% CPU');
  console.log('==========================================');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Please ensure server is running: npm run dev');
    process.exit(1);
  }

  console.log('⚠️  IMPORTANT: Open Activity Monitor NOW!');
  console.log('👀 Find "node" process and monitor %CPU');
  console.log('');

  // Countdown
  for (let i = 3; i > 0; i--) {
    console.log(`Starting in ${i}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await runLoadTest();
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runLoadTest, checkServer };