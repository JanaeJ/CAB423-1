const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码 (使用硬编码密码进行演示)
    const isValidPassword = (username === 'admin' && password === 'admin123') ||
                           (username === 'user1' && password === 'user123');

    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户信息
router.get('/me', (req, res) => {
  // 这个端点需要认证中间件
  res.json({
    user: req.user
  });
});

module.exports = router;
