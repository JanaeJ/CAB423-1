const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'http://localhost:3000';
const TEST_DURATION = 5 * 60 * 1000; // 5分钟
const CONCURRENT_REQUESTS = 10;
const REQUEST_INTERVAL = 1000; // 1秒间隔

// 测试用户凭据
const testUsers = [
  { username: 'admin', password: 'admin123' },
  { username: 'user1', password: 'user123' }
];

let tokens = [];
let requestCount = 0;
let successCount = 0;
let errorCount = 0;

// 生成测试图像数据
const generateTestImage = () => {
  // 创建一个简单的测试图像 (1MB)
  const width = 1000;
  const height = 1000;
  const buffer = Buffer.alloc(width * height * 3);
  
  for (let i = 0; i < buffer.length; i += 3) {
    buffer[i] = Math.floor(Math.random() * 256);     // R
    buffer[i + 1] = Math.floor(Math.random() * 256); // G
    buffer[i + 2] = Math.floor(Math.random() * 256); // B
  }
  
  return buffer;
};

// 登录获取令牌
const login = async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error(`登录失败 ${username}:`, error.response?.data || error.message);
    return null;
  }
};

// 发送图像处理请求
const sendImageProcessingRequest = async (token) => {
  try {
    const imageBuffer = generateTestImage();
    
    // 创建FormData对象
    const FormData = require('form-data');
    const formData = new FormData();
    
    // 添加图像文件
    formData.append('image', imageBuffer, {
      filename: 'test-image.jpg',
      contentType: 'image/jpeg'
    });
    
    // 添加处理选项（CPU密集型）
    formData.append('resize', JSON.stringify({ width: 2000, height: 2000 }));
    formData.append('quality', '95');
    formData.append('format', 'jpeg');
    formData.append('blur', '2');
    formData.append('sharpen', '3');
    formData.append('rotate', '45');
    formData.append('grayscale', 'true');
    formData.append('sepia', 'true');
    formData.append('brightness', '1.2');
    formData.append('contrast', '1.5');
    formData.append('saturation', '0.8');
    formData.append('hue', '30');

    const response = await axios.post(`${BASE_URL}/api/images/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      timeout: 30000 // 30秒超时
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

// 执行单个请求
const executeRequest = async () => {
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  if (!token) return;

  try {
    await sendImageProcessingRequest(token);
    successCount++;
  } catch (error) {
    errorCount++;
    console.error('请求失败:', error.response?.data || error.message);
  }
  
  requestCount++;
};

// 主负载测试函数
const runLoadTest = async () => {
  console.log('开始负载测试...');
  console.log(`目标持续时间: ${TEST_DURATION / 1000} 秒`);
  console.log(`并发请求数: ${CONCURRENT_REQUESTS}`);
  console.log(`请求间隔: ${REQUEST_INTERVAL}ms`);
  console.log('正在登录用户...');

  // 登录所有测试用户
  for (const user of testUsers) {
    const token = await login(user.username, user.password);
    if (token) {
      tokens.push(token);
      console.log(`用户 ${user.username} 登录成功`);
    }
  }

  if (tokens.length === 0) {
    console.error('没有用户登录成功，无法进行负载测试');
    return;
  }

  console.log(`成功登录 ${tokens.length} 个用户`);
  console.log('开始发送请求...');

  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION;

  // 创建并发请求
  const requestPromises = [];
  
  while (Date.now() < endTime) {
    // 创建新的并发请求
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      requestPromises.push(executeRequest());
    }
    
    // 等待所有请求完成
    await Promise.all(requestPromises);
    
    // 等待间隔时间
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
  }

  const totalTime = (Date.now() - startTime) / 1000;
  
  console.log('\n负载测试完成!');
  console.log(`总时间: ${totalTime.toFixed(2)} 秒`);
  console.log(`总请求数: ${requestCount}`);
  console.log(`成功请求: ${successCount}`);
  console.log(`失败请求: ${errorCount}`);
  console.log(`成功率: ${((successCount / requestCount) * 100).toFixed(2)}%`);
  console.log(`平均请求速率: ${(requestCount / totalTime).toFixed(2)} 请求/秒`);
};

// 检查服务器是否运行
const checkServer = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('服务器状态:', response.data);
    return true;
  } catch (error) {
    console.error('服务器未运行或无法访问');
    return false;
  }
};

// 主函数
const main = async () => {
  console.log('CAB432 负载测试工具');
  console.log('==================');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('请确保服务器正在运行在 http://localhost:3000');
    process.exit(1);
  }

  await runLoadTest();
};

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runLoadTest, checkServer };
