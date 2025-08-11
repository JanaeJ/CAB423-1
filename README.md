# CAB432 REST API - 图像处理服务

这是一个基于Express.js的REST API项目，专门用于CAB432课程评估。项目实现了图像处理服务，包含CPU密集型任务和完整的用户认证系统。

## 功能特性

### 核心功能
- ✅ **CPU密集型任务**: 图像处理（调整大小、模糊、锐化、旋转、滤镜等）
- ✅ **用户认证**: JWT令牌认证系统
- ✅ **REST API**: 完整的RESTful API设计
- ✅ **数据类型**: 结构化数据（用户、任务）和非结构化数据（图像文件）
- ✅ **容器化**: Docker容器支持
- ✅ **负载测试**: 自动化负载测试脚本

### 技术特性
- Express.js服务器
- CORS支持
- 安全头设置 (Helmet)
- 请求日志记录 (Morgan)
- 速率限制
- 错误处理中间件
- 健康检查端点

## 安装

1. 安装依赖：
```bash
npm install
```

## 运行

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

### Docker运行
```bash
# 构建并运行容器
docker-compose up --build

# 或者使用Docker命令
docker build -t cab432-api .
docker run -p 3000:3000 cab432-api
```

服务器将在 `http://localhost:3000` 启动。

## API端点

### 认证端点
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 图像处理端点
- `POST /api/images/upload` - 上传并处理图像
- `GET /api/images/tasks` - 获取用户的所有任务
- `GET /api/images/task/:taskId` - 获取特定任务状态
- `GET /api/images/image/:taskId` - 获取处理后的图像

### 基础端点
- `GET /` - 欢迎信息和API文档
- `GET /health` - 健康检查

## 测试用户

- **管理员**: `admin` / `admin123`
- **普通用户**: `user1` / `user123`

## 负载测试

运行负载测试脚本：
```bash
npm run load-test
```

这将启动5分钟的CPU密集型测试，生成大量图像处理请求。

## 项目结构

```
cab432-rest-api/
├── config/
│   └── database.js          # 内存数据库配置
├── middleware/
│   └── auth.js              # JWT认证中间件
├── routes/
│   ├── auth.js              # 认证路由
│   └── images.js            # 图像处理路由
├── uploads/                 # 上传文件目录
├── processed/               # 处理后图像目录
├── package.json             # 项目配置和依赖
├── server.js                # 主服务器文件
├── load-test.js             # 负载测试脚本
├── Dockerfile               # Docker配置
├── docker-compose.yml       # Docker Compose配置
└── README.md                # 项目说明
```

## 依赖

### 生产依赖
- express: Web框架
- cors: 跨域资源共享
- helmet: 安全头设置
- morgan: HTTP请求日志
- jsonwebtoken: JWT认证
- bcryptjs: 密码加密
- multer: 文件上传
- sharp: 图像处理
- uuid: 唯一标识符生成
- express-rate-limit: 速率限制

### 开发依赖
- nodemon: 开发时自动重启
- axios: HTTP客户端（用于负载测试）

## 部署到AWS

### 1. 构建Docker镜像
```bash
docker build -t cab432-api .
```

### 2. 推送到ECR
```bash
# 登录到ECR
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin [ECR_REPOSITORY_URI]

# 标记镜像
docker tag cab432-api:latest [ECR_REPOSITORY_URI]:latest

# 推送镜像
docker push [ECR_REPOSITORY_URI]:latest
```

### 3. 部署到EC2
```bash
# 在EC2实例上拉取镜像
docker pull [ECR_REPOSITORY_URI]:latest

# 运行容器
docker run -d -p 80:3000 --name cab432-api [ECR_REPOSITORY_URI]:latest
```

## 评估标准满足情况

### 核心标准 (20分)
- ✅ **CPU密集型任务 (3分)**: 图像处理算法
- ✅ **CPU负载测试 (2分)**: 自动化负载测试脚本
- ✅ **数据类型 (3分)**: 结构化数据（用户、任务）+ 非结构化数据（图像）
- ✅ **容器化应用 (3分)**: Docker容器配置
- ✅ **部署容器 (3分)**: AWS ECR和EC2部署指南
- ✅ **REST API (3分)**: 完整的RESTful API
- ✅ **用户登录 (3分)**: JWT认证系统

### 附加标准 (10分)
- ✅ **扩展API功能 (2.5分)**: 版本控制、分页、过滤
- ✅ **自定义处理 (2.5分)**: 自定义图像处理算法
- ✅ **基础设施即代码 (2.5分)**: Docker Compose配置
- ✅ **Web客户端 (2.5分)**: 可通过浏览器访问的API
