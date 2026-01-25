#!/bin/bash

# 地图全景系统快速启动脚本
# 适用于SQLite版本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Node.js
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    log_success "Node.js 检查通过: $(node -v)"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装根目录依赖
    npm install
    
    # 安装客户端依赖
    log_info "安装客户端依赖..."
    cd client && npm install && cd ..
    
    # 安装服务端依赖
    log_info "安装服务端依赖..."
    cd server && npm install && cd ..
    
    log_success "依赖安装完成"
}

# 初始化数据库
init_database() {
    log_info "初始化SQLite数据库..."
    
    cd server
    if node init-sqlite-data.js; then
        log_success "数据库初始化完成"
    else
        log_error "数据库初始化失败"
        exit 1
    fi
    cd ..
}

# 检查并清理端口
cleanup_ports() {
    log_info "检查端口占用情况..."
    
    # 检查3000端口
    if lsof -i :3000 >/dev/null 2>&1; then
        log_warning "端口3000被占用，尝试清理..."
        pkill -f "vite" 2>/dev/null || true
        sleep 2
    fi
    
    # 检查3002端口
    if lsof -i :3002 >/dev/null 2>&1; then
        log_warning "端口3002被占用，尝试清理..."
        pkill -f "nodemon\|src/server.js" 2>/dev/null || true
        sleep 2
    fi
}

# 启动服务
start_services() {
    log_info "启动开发服务..."
    
    # 清理端口
    cleanup_ports
    
    log_info "前端地址: http://localhost:3000"
    log_info "后端地址: http://localhost:3002"
    log_info "请确保两个服务都正常启动后再访问前端"
    
    # 启动开发服务
    npm run dev
}

# 显示帮助信息
show_help() {
    echo "地图全景系统启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h     显示帮助信息"
    echo "  --init-only    仅初始化数据库，不启动服务"
    echo "  --no-deps      跳过依赖安装"
    echo ""
    echo "示例:"
    echo "  $0              # 完整启动（安装依赖、初始化数据库、启动服务）"
    echo "  $0 --init-only  # 仅初始化数据库"
    echo "  $0 --no-deps    # 跳过依赖安装，直接启动"
}

# 主函数
main() {
    echo "=== 🚀 地图全景系统启动脚本 ==="
    echo ""
    
    # 解析参数
    local init_only=false
    local skip_deps=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --init-only)
                init_only=true
                shift
                ;;
            --no-deps)
                skip_deps=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查环境
    check_nodejs
    
    # 安装依赖
    if [ "$skip_deps" = false ]; then
        install_dependencies
    else
        log_warning "跳过依赖安装"
    fi
    
    # 初始化数据库
    init_database
    
    # 如果只是初始化，则退出
    if [ "$init_only" = true ]; then
        log_success "数据库初始化完成，退出"
        exit 0
    fi
    
    # 启动服务
    start_services
}

# 运行主函数
main "$@"