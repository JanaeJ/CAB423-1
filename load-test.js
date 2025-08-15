const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_JOBS = 50; 

// Generate larger test video data 
const generateTestVideo = (index) => {
  const size = 20 * 1024 * 1024 * 1024; 
  const buffer = Buffer.alloc(size);
  
  // Fill with random data
  for (let i = 0; i < buffer.length; i += 4) {
    const value = Math.floor(Math.random() * 0x7FFFFFFF);
    buffer.writeUInt32BE(value, i);
  }
  
  return buffer;
};

// Login and get token
const login = async () => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  return response.data.token;
};

// Send CPU-intensive request
const sendRequest = async (token, index) => {
  try {
    
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
    
    console.log(`Job ${index} submitted successfully`);
  } catch (error) {
    console.log(`Job ${index} failed: ${error.message}`);
  }
};

// Main load test
const runLoadTest = async () => {
  console.log('Starting CPU Load Test');

  const token = await login();
  
  // Send multiple concurrent requests
  const promises = [];
  for (let i = 1; i <= CONCURRENT_JOBS; i++) {
    promises.push(sendRequest(token, i));
  }
  
  await Promise.allSettled(promises);
  
  console.log('Load test completed');

};

// Run the test
runLoadTest().catch(console.error);