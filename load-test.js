const axios = require('axios');
const FormData = require('form-data');
const os = require('os');

//const BASE_URL = 'http://localhost';
const BASE_URL = 'http://54.253.76.184';
const CONCURRENT_JOBS = 50;

let startTime;
let jobsSubmitted = 0;
let jobsCompleted = 0;

const getCpuUsage = () => {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  return 100 - Math.round(100 * totalIdle / totalTick);
};

const generateTestVideo = (index) => {
  const size = 10 * 1024 * 1024;
  const buffer = Buffer.alloc(size);
  
  for (let i = 0; i < buffer.length; i += 4) {
    const value = Math.floor(Math.random() * 0x7FFFFFFF);
    buffer.writeUInt32BE(value, i);
  }
  
  return buffer;
};

const login = async () => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  return response.data.token;
};

const sendRequest = async (token, index) => {
  try {
    jobsSubmitted++;
    const videoBuffer = generateTestVideo(index);
    const formData = new FormData();
    
    formData.append('video', videoBuffer, {
      filename: `test-video-${index}.mp4`,
      contentType: 'video/mp4'
    });
    formData.append('title', `Load Test ${index}`);
    formData.append('quality', 'slow');
    formData.append('resolution', '1080p');
    formData.append('codec', 'h265');

    await axios.post(`${BASE_URL}/jobs/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      timeout: 120000
    });
    
    jobsCompleted++;
    console.log(`Job ${index} submitted successfully`);
  } catch (error) {
    console.log(`Job ${index} failed: ${error.message}`);
  }
};

const startMonitoring = () => {
  const interval = setInterval(() => {
    const cpu = getCpuUsage();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
    
    console.log(`Time: ${elapsed}s | CPU: ${cpu}% | Jobs: ${jobsCompleted}/${jobsSubmitted} | Memory: ${memory}MB`);
    
    if (cpu > 80) {
      console.log(`🔥 HIGH CPU: ${cpu}% - Target achieved!`);
    }
  }, 5000);
  
  setTimeout(() => {
    clearInterval(interval);
    console.log('\nLoad test completed');
    process.exit(0);
  }, 10 * 60 * 1000);
};

const runLoadTest = async () => {
  console.log('Starting CPU Load Test');
  startTime = Date.now();
  
  const token = await login();
  startMonitoring();
  
  const promises = [];
  for (let i = 1; i <= CONCURRENT_JOBS; i++) {
    promises.push(sendRequest(token, i));
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  await Promise.allSettled(promises);
  console.log('All jobs submitted');
};

runLoadTest().catch(console.error);