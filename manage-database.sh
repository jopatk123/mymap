#!/bin/bash

# 数据库管理脚本
# 提供数据库的状态检查、启动、停止、重置等功能

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

# 检查容器状态
check_status() {
    echo "=== 📊 数据库状态检查 ==="
    echo ""
    
    # 检查Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker 未安装"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 未运行"
        return 1
    fi
    
    log_success "Docker 运行正常"
    
    # 检查容器
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        local status=$(docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null)
        local health=$(docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME} 2>/dev/null)
        
        echo "容器名称: ${CONTAINER_NAME}"
        echo "容器状态: $status"
        if [[ $health != "<no value>" ]]; then
            echo "健康状态: $health"
        fi
        
        if [[ $status == "running" ]]; then
            log_success "MySQL容器运行正常"
            
            # 检查数据库连接
            if docker exec ${CONTAINER_NAME} mysqladmin ping -h localhost -u root -p${DB_PASSWORD} >/dev/null 2>&1; then
                log_success "数据库连接正常"
                
                # 检查数据
                local tables=$(docker exec ${CONTAINER_NAME} mysql -u root -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;" 2>/dev/null | grep -v "Tables_in_" | wc -l)
                local count=$(docker exec ${CONTAINER_NAME} mysql -u root -p${DB_PASSWORD} ${DB_NAME} -e "SELECT COUNT(*) FROM panoramas;" 2>/dev/null | tail -1)
                
                echo "数据表数量: $tables"
                echo "全景图数量: $count"
                
                return 0
            else
                log_error "数据库连接失败"
                return 1
            fi
        else
            log_warning "MySQL容器未运行"
            return 1
        fi
    else
        log_warning "未找到MySQL容器"
        return 1
    fi
}

# 启动数据库
start_database() {
    echo "=== 🚀 启动数据库 ==="
    echo ""
    
    if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_success "MySQL容器已在运行"
        return 0
    fi
    
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_info "启动现有容器..."
        docker start ${CONTAINER_NAME}
        sleep 5
        log_success "MySQL容器启动成功"
    else
        log_error "未找到MySQL容器，请先运行部署脚本"
        return 1
    fi
}

# 停止数据库
stop_database() {
    echo "=== 🛑 停止数据库 ==="
    echo ""
    
    if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_info "停止MySQL容器..."
        docker stop ${CONTAINER_NAME}
        log_success "MySQL容器已停止"
    else
        log_warning "MySQL容器未运行"
    fi
}

# 重启数据库
restart_database() {
    echo "=== 🔄 重启数据库 ==="
    echo ""
    
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_info "重启MySQL容器..."
        docker restart ${CONTAINER_NAME}
        sleep 5
        log_success "MySQL容器重启成功"
    else
        log_error "未找到MySQL容器"
        return 1
    fi
}

# 查看日志
show_logs() {
    echo "=== 📋 数据库日志 ==="
    echo ""
    
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        docker logs --tail=50 ${CONTAINER_NAME}
    else
        log_error "未找到MySQL容器"
        return 1
    fi
}

# 连接数据库
connect_database() {
    echo "=== 🔗 连接数据库 ==="
    echo ""
    
    if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_info "连接到MySQL数据库..."
        docker exec -it ${CONTAINER_NAME} mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}
    else
        log_error "MySQL容器未运行"
        return 1
    fi
}

# 备份数据库
backup_database() {
    echo "=== 💾 备份数据库 ==="
    echo ""
    
    if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        local backup_file="backup_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
        log_info "备份数据库到: $backup_file"
        
        docker exec ${CONTAINER_NAME} mysqldump -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > $backup_file
        
        if [[ -f $backup_file ]]; then
            log_success "数据库备份完成: $backup_file"
        else
            log_error "数据库备份失败"
            return 1
        fi
    else
        log_error "MySQL容器未运行"
        return 1
    fi
}

# 重置数据库
reset_database() {
    echo "=== ⚠️  重置数据库 ==="
    echo ""
    
    read -p "确定要重置数据库吗？这将删除所有数据！(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
            log_info "重置数据库..."
            
            # 删除并重新创建数据库
            docker exec ${CONTAINER_NAME} mysql -u ${DB_USER} -p${DB_PASSWORD} -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            
            # 设置字符编码
            docker exec ${CONTAINER_NAME} mysql -u ${DB_USER} -p${DB_PASSWORD} -e "SET GLOBAL character_set_client = utf8mb4; SET GLOBAL character_set_connection = utf8mb4; SET GLOBAL character_set_results = utf8mb4;"
            
            # 重新导入数据
            if [[ -f "setup-mysql.sql" ]]; then
                docker exec -i ${CONTAINER_NAME} mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} --default-character-set=utf8mb4 < setup-mysql.sql
                log_success "数据库重置完成"
            else
                log_error "未找到 setup-mysql.sql 文件"
                return 1
            fi
        else
            log_error "MySQL容器未运行"
            return 1
        fi
    else
        log_info "取消重置操作"
    fi
}

# 显示帮助信息
show_help() {
    echo "数据库管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  status    检查数据库状态"
    echo "  start     启动数据库"
    echo "  stop      停止数据库"
    echo "  restart   重启数据库"
    echo "  logs      查看数据库日志"
    echo "  connect   连接数据库"
    echo "  backup    备份数据库"
    echo "  reset     重置数据库（危险操作）"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 status"
    echo "  $0 start"
    echo "  $0 backup"
}

# 主函数
main() {
    case "${1:-status}" in
        "status")
            check_status
            ;;
        "start")
            start_database
            ;;
        "stop")
            stop_database
            ;;
        "restart")
            restart_database
            ;;
        "logs")
            show_logs
            ;;
        "connect")
            connect_database
            ;;
        "backup")
            backup_database
            ;;
        "reset")
            reset_database
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

# 运行主函数
main "$@"