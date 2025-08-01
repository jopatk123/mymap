#!/bin/bash

# MySQL 智能自动部署脚本
# 支持Docker容器和本地安装两种方式
# 使用密码: asd123123123

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
CONTAINER_NAME="mysql-panorama"
DB_NAME="panorama_map"
DB_USER="root"
DB_PASSWORD="asd123123123"
DB_PORT="3306"

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

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查Docker是否安装
check_docker() {
    if command_exists docker; then
        if docker info >/dev/null 2>&1; then
            log_success "Docker 已安装并运行"
            return 0
        else
            log_warning "Docker 已安装但未运行，尝试启动..."
            sudo systemctl start docker 2>/dev/null || true
            sleep 3
            if docker info >/dev/null 2>&1; then
                log_success "Docker 启动成功"
                return 0
            else
                log_error "Docker 启动失败"
                return 1
            fi
        fi
    else
        log_warning "Docker 未安装"
        return 1
    fi
}

# 检查现有MySQL容器
check_existing_container() {
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        local status=$(docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null)
        case $status in
            "running")
                log_success "MySQL容器 ${CONTAINER_NAME} 正在运行"
                return 0
                ;;
            "exited")
                log_warning "MySQL容器 ${CONTAINER_NAME} 已停止，正在启动..."
                docker start ${CONTAINER_NAME}
                sleep 5
                log_success "MySQL容器启动成功"
                return 0
                ;;
            *)
                log_warning "MySQL容器状态异常: $status"
                return 1
                ;;
        esac
    else
        log_info "未找到MySQL容器 ${CONTAINER_NAME}"
        return 1
    fi
}

# 检查端口占用
check_port() {
    if netstat -tlnp 2>/dev/null | grep -q ":${DB_PORT} "; then
        local process=$(netstat -tlnp 2>/dev/null | grep ":${DB_PORT} " | awk '{print $7}' | head -1)
        if [[ $process == *"docker-proxy"* ]]; then
            log_info "端口 ${DB_PORT} 被Docker容器占用"
            return 0
        else
            log_warning "端口 ${DB_PORT} 被其他进程占用: $process"
            return 1
        fi
    else
        log_info "端口 ${DB_PORT} 可用"
        return 0
    fi
}

# 安装Docker
install_docker() {
    log_info "开始安装Docker..."
    
    # 检查操作系统
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
    fi
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        # 更新包列表
        sudo apt update
        
        # 安装必要的包
        sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        # 添加Docker官方GPG密钥
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # 添加Docker仓库
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # 安装Docker
        sudo apt update
        sudo apt install -y docker-ce docker-ce-cli containerd.io
        
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        # 安装必要的包
        sudo yum install -y yum-utils
        
        # 添加Docker仓库
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        
        # 安装Docker
        sudo yum install -y docker-ce docker-ce-cli containerd.io
        
    else
        log_error "不支持的操作系统: $OS"
        return 1
    fi
    
    # 启动Docker服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 添加当前用户到docker组
    sudo usermod -aG docker $USER
    
    log_success "Docker 安装完成"
    log_warning "请重新登录以使用Docker命令，或运行: newgrp docker"
}

# 创建MySQL容器
create_mysql_container() {
    log_info "创建MySQL容器..."
    
    # 检查端口占用
    if ! check_port; then
        log_error "端口 ${DB_PORT} 被占用，请先停止占用进程"
        return 1
    fi
    
    # 创建并启动MySQL容器
    docker run -d \
        --name ${CONTAINER_NAME} \
        -e MYSQL_ROOT_PASSWORD=${DB_PASSWORD} \
        -e MYSQL_DATABASE=${DB_NAME} \
        -p ${DB_PORT}:3306 \
        --restart=unless-stopped \
        mysql:8.0
    
    log_info "等待MySQL容器启动..."
    
    # 等待MySQL完全启动
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec ${CONTAINER_NAME} mysqladmin ping -h localhost -u root -p${DB_PASSWORD} >/dev/null 2>&1; then
            log_success "MySQL容器启动成功"
            return 0
        fi
        
        log_info "等待MySQL启动... (${attempt}/${max_attempts})"
        sleep 5
        ((attempt++))
    done
    
    log_error "MySQL容器启动超时"
    docker logs ${CONTAINER_NAME}
    return 1
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 检查setup-mysql.sql文件是否存在
    if [[ ! -f "setup-mysql.sql" ]]; then
        log_error "未找到 setup-mysql.sql 文件"
        return 1
    fi
    
    # 导入数据库结构和数据
    if docker exec -i ${CONTAINER_NAME} mysql -u root -p${DB_PASSWORD} ${DB_NAME} < setup-mysql.sql; then
        log_success "数据库初始化完成"
    else
        log_error "数据库初始化失败"
        return 1
    fi
}

# 验证数据库
verify_database() {
    log_info "验证数据库..."
    
    # 检查数据库连接
    if ! docker exec ${CONTAINER_NAME} mysql -u root -p${DB_PASSWORD} -e "USE ${DB_NAME}; SELECT 1;" >/dev/null 2>&1; then
        log_error "数据库连接失败"
        return 1
    fi
    
    # 检查表
    local tables=$(docker exec ${CONTAINER_NAME} mysql -u root -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;" 2>/dev/null | grep -v "Tables_in_" | wc -l)
    if [[ $tables -gt 0 ]]; then
        log_success "发现 $tables 个数据表"
    else
        log_warning "未发现数据表"
    fi
    
    # 检查示例数据
    local count=$(docker exec ${CONTAINER_NAME} mysql -u root -p${DB_PASSWORD} ${DB_NAME} -e "SELECT COUNT(*) FROM panoramas;" 2>/dev/null | tail -1)
    if [[ $count -gt 0 ]]; then
        log_success "发现 $count 条全景图数据"
    else
        log_warning "未发现全景图数据"
    fi
}

# 更新环境配置
update_env_config() {
    log_info "更新环境配置..."
    
    local env_file="server/.env"
    if [[ -f $env_file ]]; then
        # 备份原文件
        cp $env_file "${env_file}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # 更新数据库密码
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" $env_file
        
        log_success "环境配置已更新"
    else
        log_warning "未找到环境配置文件: $env_file"
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=== 🎉 MySQL 部署完成 ==="
    echo ""
    echo "📋 部署信息:"
    echo "   容器名称: ${CONTAINER_NAME}"
    echo "   数据库名: ${DB_NAME}"
    echo "   用户名: ${DB_USER}"
    echo "   密码: ${DB_PASSWORD}"
    echo "   端口: ${DB_PORT}"
    echo ""
    echo "🔧 管理命令:"
    echo "   查看容器状态: docker ps"
    echo "   查看容器日志: docker logs ${CONTAINER_NAME}"
    echo "   连接数据库: docker exec -it ${CONTAINER_NAME} mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}"
    echo "   重启容器: docker restart ${CONTAINER_NAME}"
    echo "   停止容器: docker stop ${CONTAINER_NAME}"
    echo ""
    echo "✅ 数据库已就绪，可以启动项目了！"
}

# 主函数
main() {
    echo "=== 🚀 MySQL 智能自动部署脚本 ==="
    echo ""
    
    # 1. 检查现有容器
    if check_existing_container; then
        log_info "使用现有MySQL容器"
        
        # 验证数据库
        if verify_database; then
            update_env_config
            show_deployment_info
            return 0
        else
            log_warning "现有容器数据异常，重新初始化..."
            if init_database && verify_database; then
                update_env_config
                show_deployment_info
                return 0
            fi
        fi
    fi
    
    # 2. 检查Docker
    if ! check_docker; then
        log_info "尝试安装Docker..."
        if ! install_docker; then
            log_error "Docker安装失败，退出"
            exit 1
        fi
        log_warning "Docker已安装，请重新运行此脚本"
        exit 0
    fi
    
    # 3. 创建新容器
    if create_mysql_container; then
        sleep 10  # 等待容器完全启动
        
        # 4. 初始化数据库
        if init_database; then
            # 5. 验证数据库
            if verify_database; then
                # 6. 更新配置
                update_env_config
                # 7. 显示信息
                show_deployment_info
                return 0
            fi
        fi
    fi
    
    log_error "MySQL部署失败"
    exit 1
}

# 运行主函数
main "$@"