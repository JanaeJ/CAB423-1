#!/bin/bash

# CAB432 REST API 部署脚本
# 使用方法: ./deploy.sh [EC2_IP] [KEY_FILE]

set -e

EC2_IP=$1
KEY_FILE=$2

if [ -z "$EC2_IP" ] || [ -z "$KEY_FILE" ]; then
    echo "使用方法: ./deploy.sh [EC2_IP] [KEY_FILE]"
    echo "例如: ./deploy.sh 52.123.456.789 my-key.pem"
    exit 1
fi

echo "🚀 开始部署CAB432 REST API到EC2实例..."

# 1. 压缩项目文件
echo "📦 压缩项目文件..."
tar -czf cab432-api.tar.gz . --exclude=node_modules --exclude=.git

# 2. 上传到EC2
echo "📤 上传文件到EC2实例..."
scp -i $KEY_FILE cab432-api.tar.gz ubuntu@$EC2_IP:~/

# 3. 在EC2上执行部署命令
echo "🔧 在EC2实例上执行部署..."
ssh -i $KEY_FILE ubuntu@$EC2_IP << 'EOF'
    echo "更新系统..."
    sudo apt update -y
    
    echo "安装Docker..."
    sudo apt install docker.io -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    
    echo "安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "解压项目文件..."
    cd ~
    tar -xzf cab432-api.tar.gz
    cd cab432-rest-api
    
    echo "创建必要目录..."
    mkdir -p uploads processed
    
    echo "构建Docker镜像..."
    docker build -t cab432-api .
    
    echo "停止现有容器..."
    docker stop cab432-api || true
    docker rm cab432-api || true
    
    echo "启动新容器..."
    docker run -d \
      --name cab432-api \
      -p 80:3000 \
      -v $(pwd)/uploads:/app/uploads \
      -v $(pwd)/processed:/app/processed \
      -e NODE_ENV=production \
      -e JWT_SECRET=cab432-secret-key \
      --restart unless-stopped \
      cab432-api
    
    echo "清理临时文件..."
    rm cab432-api.tar.gz
    
    echo "检查容器状态..."
    docker ps
    docker logs cab432-api
EOF

# 4. 清理本地临时文件
echo "🧹 清理本地临时文件..."
rm cab432-api.tar.gz

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$EC2_IP"
echo "📖 API文档: http://$EC2_IP"
echo "💚 健康检查: http://$EC2_IP/health"
echo ""
echo "🔐 测试用户:"
echo "  管理员: admin / admin123"
echo "  普通用户: user1 / user123"
