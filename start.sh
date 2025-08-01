#!/bin/bash

# 地图全景系统快速启动脚本
# 整合了数据库自动部署和项目管理功能

set -e

# 颜色定义
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
    log_info "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js (>= 16.0.0)"
        echo "下载地址: https://nodejs.org/"
        return 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        return 1
    fi
    
    log_success "Node.js 版本: $(node --version)"
    log_success "npm 版本: $(npm --version)"
    
    # 检查项目依赖
    if [[ ! -d "server/node_modules" ]]; then
        log_warning "服务器依赖未安装，正在安装和更新..."
        cd server && npm install && npm update && cd ..
        if [[ $? -ne 0 ]]; then
            log_error "服务器依赖安装失败"
            return 1
        fi
        log_success "服务器依赖安装完成"
    fi
    
    if [[ ! -d "client/node_modules" ]]; then
        log_warning "客户端依赖未安装，正在安装和更新..."
        cd client && npm install && npm update && cd ..
        if [[ $? -ne 0 ]]; then
            log_error "客户端依赖安装失败"
            return 1
        fi
        log_success "客户端依赖安装完成"
    fi
    
    return 0
}

# 检查数据库状态
check_database() {
    log_info "检查数据库状态..."
    
    # 运行数据库检查脚本
    cd server
    if node check-database.js >/dev/null 2>&1; then
        log_success "数据库连接正常"
        cd ..
        return 0
    else
        log_warning "数据库连接失败，尝试自动部署..."
        cd ..
        
        # 运行自动部署脚本
        if ./auto-install-mysql.sh >/dev/null 2>&1; then
            log_success "数据库部署完成"
            return 0
        else
            log_error "数据库部署失败"
            echo ""
            echo "💡 手动解决方案:"
            echo "1. 运行: ./auto-install-mysql.sh"
            echo "2. 或查看: ./manage-database.sh status"
            return 1
        fi
    fi
}

# 检查配置文件
check_config() {
    log_info "检查配置文件..."
    
    if [ ! -f "server/.env" ]; then
        log_warning "创建后端配置文件..."
        cat > server/.env << EOF
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=asd123123123
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
        log_success "已创建默认配置文件 server/.env"
    else
        log_success "配置文件已存在"
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p server/uploads/panoramas
    mkdir -p server/uploads/thumbnails
    mkdir -p server/logs
    
    log_success "目录创建完成"
}

# 检查端口是否被占用
check_ports_occupied() {
    log_info "检查关键端口 3000 (前端) 和 3001 (后端)..."
    
    local port_3000_used=false
    local port_3001_used=false

    # 使用 lsof 检查端口，更可靠
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        port_3000_used=true
    fi

    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        port_3001_used=true
    fi

    if [[ "$port_3000_used" = true || "$port_3001_used" = true ]]; then
        log_error "服务启动失败：一个或多个关键端口已被占用。"
        if [[ "$port_3000_used" = true ]]; then
            log_warning "--> 前端端口 3000 已被占用。"
        fi
        if [[ "$port_3001_used" = true ]]; then
            log_warning "--> 后端端口 3001 已被占用。"
        fi
        echo ""
        echo "💡 请先停止现有服务。可以尝试运行:"
        echo "   ./stop.sh"
        echo "   或"
        echo "   ./start.sh stop"
        echo ""
        exit 1
    fi

    log_success "关键端口可用"
}


# 启动服务器
start_server() {
    log_info "启动后端服务..."
    
    cd server
    
    # 启动服务器（后台运行）
    npm run dev > ../server.log 2>&1 &
    local server_pid=$!
    echo $server_pid > ../server.pid
    
    cd ..
    
    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 5
    
    # 检查服务器是否启动成功
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        log_success "后端服务启动成功 (PID: $server_pid)"
        return 0
    else
        log_warning "后端服务可能未完全启动，请检查日志"
        return 0
    fi
}

# 启动客户端
start_client() {
    log_info "启动前端服务..."
    
    cd client
    
    # 启动客户端（后台运行）
    npm run dev > ../client.log 2>&1 &
    local client_pid=$!
    echo $client_pid > ../client.pid
    
    cd ..
    
    # 等待客户端启动
    log_info "等待前端服务启动..."
    sleep 8
    
    # 检查客户端是否启动成功
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log_success "前端服务启动成功 (PID: $client_pid)"
        return 0
    else
        log_warning "前端服务可能未完全启动，请检查日志"
        return 0
    fi
}

# 启动服务（前台模式）
start_services_foreground() {
    log_info "启动开发服务器（前台模式）..."
    
    echo ""
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

# 启动服务（后台模式）
start_services_background() {
    log_info "启动项目服务（后台模式）..."
    
    # 1. 启动服务器
    if ! start_server; then
        log_error "服务器启动失败"
        return 1
    fi
    
    # 2. 启动客户端
    if ! start_client; then
        log_error "客户端启动失败"
        return 1
    fi
    
    # 3. 显示信息
    show_project_info
}

# 显示项目信息
show_project_info() {
    echo ""
    echo "=== 🎉 项目启动完成 ==="
    echo ""
    echo "📋 服务信息:"
    echo "   前端地址: http://localhost:3000"
    echo "   后端地址: http://localhost:3001"
    echo "   数据库: mysql-panorama (端口 3306)"
    echo ""
    echo "📝 日志文件:"
    echo "   前端日志: client.log"
    echo "   后端日志: server.log"
    echo ""
    echo "🔧 管理命令:"
    echo "   停止项目: ./stop.sh"
    echo "   查看状态: ./start.sh status"
    echo "   查看数据库: ./manage-database.sh status"
    echo "   查看日志: tail -f server.log 或 tail -f client.log"
    echo ""
    echo "🌐 打开浏览器访问: http://localhost:3000"
}

# 停止项目
stop_project() {
    log_info "停止项目服务..."

    # 1. 优先使用 PID 文件停止 (如果存在)
    if [[ -f server.pid ]]; then
        local server_pid=$(cat server.pid)
        if kill -0 "$server_pid" 2>/dev/null; then
            kill "$server_pid" 2>/dev/null
            log_success "已发送停止信号到后端服务 (PID: $server_pid)"
        fi
        rm -f server.pid
    fi
    
    if [[ -f client.pid ]]; then
        local client_pid=$(cat client.pid)
        if kill -0 "$client_pid" 2>/dev/null; then
            kill "$client_pid" 2>/dev/null
            log_success "已发送停止信号到前端服务 (PID: $client_pid)"
        fi
        rm -f client.pid
    fi

    # 2. 强制按端口停止，这是最可靠的后备措施
    log_info "检查并停止占用端口的进程..."
    local client_port_pid=$(lsof -t -i:3000 2>/dev/null)
    if [[ -n "$client_port_pid" ]]; then
        # 使用-9信号确保进程被终止
        kill -9 "$client_port_pid" 2>/dev/null || true
        log_success "已强制停止占用前端端口 3000 的进程 (PID: $client_port_pid)"
    else
        log_info "前端端口 3000 未被占用"
    fi

    local server_port_pid=$(lsof -t -i:3001 2>/dev/null)
    if [[ -n "$server_port_pid" ]]; then
        kill -9 "$server_port_pid" 2>/dev/null || true
        log_success "已强制停止占用后端端口 3001 的进程 (PID: $server_port_pid)"
    else
        log_info "后端端口 3001 未被占用"
    fi
    
    # 3. 使用 pkill 作为最终清理，捕获任何孤立进程
    log_info "最终清理：检查并停止任何残留的开发进程..."
    pkill -f "npm run dev" 2>/dev/null && log_info "清理了残留的 npm dev 进程"
    pkill -f "vite" 2>/dev/null && log_info "清理了残留的 Vite 进程"
    pkill -f "node.*server.js" 2>/dev/null && log_info "清理了残留的 Node.js 服务器进程"
    
    # 4. 清理日志文件
    log_info "清理日志文件..."
    rm -f server.log client.log
    
    log_success "项目已完全停止"
}

# 检查项目状态
check_project_status() {
    echo "=== 📊 项目状态 ==="
    echo ""
    
    # 检查服务器
    if [[ -f server.pid ]] && kill -0 $(cat server.pid) 2>/dev/null; then
        log_success "后端服务运行中 (PID: $(cat server.pid))"
    else
        log_warning "后端服务未运行"
    fi
    
    # 检查客户端
    if [[ -f client.pid ]] && kill -0 $(cat client.pid) 2>/dev/null; then
        log_success "前端服务运行中 (PID: $(cat client.pid))"
    else
        log_warning "前端服务未运行"
    fi
    
    # 检查数据库
    echo ""
    ./manage-database.sh status
}

# 显示帮助信息
show_help() {
    echo "地图全景系统快速启动脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start         启动项目（默认，前台模式）"
    echo "  background    启动项目（后台模式）"
    echo "  stop          停止项目"
    echo "  restart       重启项目"
    echo "  status        查看项目状态"
    echo "  check         仅检查环境和依赖"
    echo "  install       仅安装依赖"
    echo "  help          显示帮助信息"
    echo ""
    echo "选项:"
    echo "  -h, --help    显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0            # 启动项目（前台模式）"
    echo "  $0 background # 启动项目（后台模式）"
    echo "  $0 stop       # 停止项目"
    echo "  $0 status     # 查看状态"
    echo ""
    echo "首次运行建议:"
    echo "  1. 运行 ./start.sh 进行完整初始化和启动"
    echo "  2. 数据库会自动部署（Docker MySQL容器）"
    echo "  3. 浏览器访问 http://localhost:3000"
    echo ""
}

# 主函数
main() {
    case "${1:-start}" in
        "start"|"")
            show_welcome
            
            # 1. 检查依赖
            if ! check_dependencies; then
                log_error "依赖检查失败"
                exit 1
            fi
            
            # 2. 检查配置
            check_config
            
            # 3. 创建目录
            create_directories
            
            # 4. 检查数据库
            if ! check_database; then
                log_error "数据库检查失败"
                exit 1
            fi
            
            # 5. 检查端口占用
            check_ports_occupied

            # 6. 启动服务（前台模式）
            start_services_foreground
            ;;
        "background")
            show_welcome
            
            # 1. 检查依赖
            if ! check_dependencies; then
                log_error "依赖检查失败"
                exit 1
            fi
            
            # 2. 检查配置
            check_config
            
            # 3. 创建目录
            create_directories
            
            # 4. 检查数据库
            if ! check_database; then
                log_error "数据库检查失败"
                exit 1
            fi
            
            # 5. 检查端口占用
            check_ports_occupied

            # 6. 启动服务（后台模式）
            start_services_background
            ;;
        "stop")
            stop_project
            ;;
        "restart")
            stop_project
            sleep 2
            main background
            ;;
        "status")
            check_project_status
            ;;
        "check")
            show_welcome
            if check_dependencies; then
                log_success "环境检查完成"
            else
                log_error "环境检查失败"
                exit 1
            fi
            ;;
        "install")
            show_welcome
            if check_dependencies; then
                log_success "依赖安装完成"
            else
                log_error "依赖安装失败"
                exit 1
            fi
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
