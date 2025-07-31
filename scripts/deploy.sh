#!/bin/bash

# 地图全景系统部署脚本

set -e

echo "开始部署地图全景系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"

# 检查Node.js和npm
check_dependencies() {
    echo -e "${YELLOW}检查依赖...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}错误: npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Node.js 版本: $(node --version)${NC}"
    echo -e "${GREEN}npm 版本: $(npm --version)${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${YELLOW}安装项目依赖...${NC}"
    
    # 安装根目录依赖
    cd "$PROJECT_ROOT"
    npm install
    
    # 安装前端依赖
    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd "$CLIENT_DIR"
    npm install
    
    # 安装后端依赖
    echo -e "${YELLOW}安装后端依赖...${NC}"
    cd "$SERVER_DIR"
    npm install
    
    echo -e "${GREEN}依赖安装完成${NC}"
}

# 构建前端
build_frontend() {
    echo -e "${YELLOW}构建前端应用...${NC}"
    cd "$CLIENT_DIR"
    npm run build
    echo -e "${GREEN}前端构建完成${NC}"
}

# 创建必要的目录
create_directories() {
    echo -e "${YELLOW}创建必要的目录...${NC}"
    
    # 创建上传目录
    mkdir -p "$SERVER_DIR/uploads/panoramas"
    mkdir -p "$SERVER_DIR/uploads/thumbnails"
    
    # 创建日志目录
    mkdir -p "$SERVER_DIR/logs"
    
    echo -e "${GREEN}目录创建完成${NC}"
}

# 设置环境变量
setup_environment() {
    echo -e "${YELLOW}设置环境变量...${NC}"
    
    if [ ! -f "$SERVER_DIR/.env" ]; then
        echo -e "${YELLOW}创建 .env 文件...${NC}"
        cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env" 2>/dev/null || {
            echo -e "${RED}警告: .env.example 文件不存在，请手动创建 .env 文件${NC}"
        }
    fi
    
    echo -e "${GREEN}环境变量设置完成${NC}"
}

# 数据库初始化
init_database() {
    echo -e "${YELLOW}初始化数据库...${NC}"
    
    if command -v mysql &> /dev/null; then
        echo -e "${YELLOW}检测到 MySQL，是否要初始化数据库? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "请输入 MySQL root 密码:"
            mysql -u root -p < "$PROJECT_ROOT/scripts/init-db.sql"
            echo -e "${GREEN}数据库初始化完成${NC}"
        fi
    else
        echo -e "${YELLOW}未检测到 MySQL，请手动执行数据库初始化脚本${NC}"
        echo "脚本位置: $PROJECT_ROOT/scripts/init-db.sql"
    fi
}

# 启动服务
start_services() {
    echo -e "${YELLOW}启动服务...${NC}"
    
    # 检查端口是否被占用
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}端口 3001 已被占用，请先停止相关服务${NC}"
        exit 1
    fi
    
    # 启动后端服务
    cd "$SERVER_DIR"
    echo -e "${YELLOW}启动后端服务...${NC}"
    npm start &
    SERVER_PID=$!
    
    # 等待服务启动
    sleep 5
    
    # 检查服务是否启动成功
    if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}后端服务启动成功 (PID: $SERVER_PID)${NC}"
    else
        echo -e "${RED}后端服务启动失败${NC}"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    echo -e "${GREEN}服务启动完成${NC}"
    echo -e "${GREEN}API 地址: http://localhost:3001/api${NC}"
    echo -e "${GREEN}健康检查: http://localhost:3001/api/health${NC}"
}

# 部署到生产环境
deploy_production() {
    echo -e "${YELLOW}部署到生产环境...${NC}"
    
    # 设置生产环境变量
    export NODE_ENV=production
    
    # 构建前端
    build_frontend
    
    # 使用 PM2 启动服务（如果安装了的话）
    if command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}使用 PM2 启动服务...${NC}"
        cd "$SERVER_DIR"
        pm2 start src/server.js --name "panorama-map-server"
        pm2 save
        echo -e "${GREEN}PM2 服务启动完成${NC}"
    else
        echo -e "${YELLOW}未安装 PM2，使用普通方式启动服务${NC}"
        start_services
    fi
}

# 显示帮助信息
show_help() {
    echo "地图全景系统部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help        显示帮助信息"
    echo "  -d, --dev         开发环境部署"
    echo "  -p, --prod        生产环境部署"
    echo "  --install-only    仅安装依赖"
    echo "  --build-only      仅构建前端"
    echo ""
}

# 主函数
main() {
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dev)
            echo -e "${GREEN}开发环境部署${NC}"
            check_dependencies
            install_dependencies
            create_directories
            setup_environment
            init_database
            start_services
            ;;
        -p|--prod)
            echo -e "${GREEN}生产环境部署${NC}"
            check_dependencies
            install_dependencies
            create_directories
            setup_environment
            init_database
            deploy_production
            ;;
        --install-only)
            check_dependencies
            install_dependencies
            ;;
        --build-only)
            build_frontend
            ;;
        *)
            echo -e "${GREEN}默认开发环境部署${NC}"
            check_dependencies
            install_dependencies
            create_directories
            setup_environment
            init_database
            start_services
            ;;
    esac
}

# 执行主函数
main "$@"