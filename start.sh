#!/bin/bash

# 地图全景系统快速启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示欢迎信息
show_welcome() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    地图全景系统                              ║"
    echo "║                  快速启动脚本                                ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║ 基于 Vue 3 + Leaflet + Pannellum 的地图全景查看系统         ║"
    echo "║ 支持高德地图瓦片、坐标系转换和全景图管理功能                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}检查系统依赖...${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js (>= 16.0.0)${NC}"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    # 检查MySQL
    if ! command -v mysql &> /dev/null; then
        echo -e "${YELLOW}⚠️  MySQL 未安装，请确保已安装并启动 MySQL 服务${NC}"
        echo "或者手动配置数据库连接信息"
    fi
    
    echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
    echo -e "${GREEN}✅ npm 版本: $(npm --version)${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${YELLOW}安装项目依赖...${NC}"
    
    # 检查是否已安装依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}安装根目录依赖...${NC}"
        npm install
    fi
    
    if [ ! -d "client/node_modules" ]; then
        echo -e "${YELLOW}安装前端依赖...${NC}"
        cd client && npm install && cd ..
    fi
    
    if [ ! -d "server/node_modules" ]; then
        echo -e "${YELLOW}安装后端依赖...${NC}"
        cd server && npm install && cd ..
    fi
    
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 检查配置文件
check_config() {
    echo -e "${YELLOW}检查配置文件...${NC}"
    
    if [ ! -f "server/.env" ]; then
        echo -e "${YELLOW}创建后端配置文件...${NC}"
        cat > server/.env << EOF
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=panorama_map

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg

# 安全配置
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000

# 日志配置
LOG_LEVEL=info
EOF
        echo -e "${GREEN}✅ 已创建默认配置文件 server/.env${NC}"
        echo -e "${YELLOW}⚠️  请根据实际情况修改数据库配置${NC}"
    fi
}

# 创建必要目录
create_directories() {
    echo -e "${YELLOW}创建必要目录...${NC}"
    
    mkdir -p server/uploads/panoramas
    mkdir -p server/uploads/thumbnails
    mkdir -p server/logs
    
    echo -e "${GREEN}✅ 目录创建完成${NC}"
}

# 初始化数据库
init_database() {
    echo -e "${YELLOW}初始化数据库...${NC}"
    
    if command -v mysql &> /dev/null; then
        echo -e "${BLUE}是否要初始化数据库? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -e "${YELLOW}请输入 MySQL root 密码:${NC}"
            if mysql -u root -p < scripts/init-db.sql; then
                echo -e "${GREEN}✅ 数据库初始化完成${NC}"
            else
                echo -e "${RED}❌ 数据库初始化失败，请检查配置${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  请手动执行数据库初始化脚本: scripts/init-db.sql${NC}"
    fi
}

# 启动服务
start_services() {
    echo -e "${YELLOW}启动服务...${NC}"
    
    # 检查端口占用
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ 端口 3001 已被占用${NC}"
        echo -e "${YELLOW}请停止占用端口的进程或修改配置文件中的端口号${NC}"
        exit 1
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ 端口 3000 已被占用${NC}"
        echo -e "${YELLOW}请停止占用端口的进程${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🚀 启动开发服务器...${NC}"
    echo -e "${BLUE}前端地址: http://localhost:3000${NC}"
    echo -e "${BLUE}后端地址: http://localhost:3001${NC}"
    echo -e "${BLUE}API文档: http://localhost:3001/api${NC}"
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
    echo ""
    
    # 使用npm script启动
    npm run dev
}

# 显示帮助信息
show_help() {
    echo "地图全景系统快速启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help        显示帮助信息"
    echo "  --check-only      仅检查环境和依赖"
    echo "  --install-only    仅安装依赖"
    echo "  --no-db           跳过数据库初始化"
    echo ""
    echo "首次运行建议:"
    echo "  1. 确保已安装 Node.js (>= 16.0.0) 和 MySQL"
    echo "  2. 运行 ./start.sh 进行完整初始化"
    echo "  3. 根据提示配置数据库连接"
    echo ""
}

# 主函数
main() {
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        --check-only)
            show_welcome
            check_dependencies
            echo -e "${GREEN}✅ 环境检查完成${NC}"
            exit 0
            ;;
        --install-only)
            show_welcome
            check_dependencies
            install_dependencies
            echo -e "${GREEN}✅ 依赖安装完成${NC}"
            exit 0
            ;;
        --no-db)
            show_welcome
            check_dependencies
            install_dependencies
            check_config
            create_directories
            start_services
            ;;
        *)
            show_welcome
            check_dependencies
            install_dependencies
            check_config
            create_directories
            init_database
            start_services
            ;;
    esac
}

# 执行主函数
main "$@"