#!/bin/bash

# 仅启动前端的快速启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 启动前端开发服务器...${NC}"

# 检查前端依赖
if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd client && npm install && cd ..
fi

# 检查端口占用
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ 端口 3000 已被占用${NC}"
    echo -e "${YELLOW}请停止占用端口的进程${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 启动前端服务器...${NC}"
echo -e "${BLUE}前端地址: http://localhost:3000${NC}"
echo -e "${YELLOW}注意: 后端服务未启动，部分功能可能无法使用${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""

# 启动前端
cd client && npm run dev