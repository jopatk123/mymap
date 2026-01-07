#!/bin/bash

# 地图全景系统停止脚本
# 用于完全停止本地开发/测试进程（Vite 前端与 Node/Nodemon 后端）

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

require_tools() {
  if ! command -v lsof >/dev/null 2>&1; then
    log_error "未检测到 lsof，请先安装 lsof 再重试"
    exit 1
  fi
}

wait_for_port_free() {
  local port="$1"
  local timeout_sec="$2"
  local waited=0
  while lsof -i :"${port}" >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$timeout_sec" ]; then
      return 1
    fi
  done
  return 0
}

kill_by_port() {
  local port="$1"
  if lsof -i :"${port}" >/dev/null 2>&1; then
    local pids
    pids=$(lsof -t -i :"${port}" | tr '\n' ' ')
    log_warning "端口 ${port} 被占用，尝试终止进程: ${pids}"
    kill -TERM ${pids} 2>/dev/null || true

    # 后端服务有 10s 优雅关闭逻辑，这里给足时间，避免强杀造成 SQLite 文件损坏
    if ! wait_for_port_free "${port}" 12; then
      log_warning "端口 ${port} 仍被占用，尝试强制终止: ${pids}"
      kill -KILL ${pids} 2>/dev/null || true
      # 再等一会确认释放
      wait_for_port_free "${port}" 5 || true
    fi

    if lsof -i :"${port}" >/dev/null 2>&1; then
      log_error "端口 ${port} 未能完全释放，请手动检查相关进程"
    else
      log_success "端口 ${port} 已释放"
    fi
  else
    log_success "端口 ${port} 空闲，无需处理"
  fi
}

kill_by_pattern() {
  local pattern="$1"
  local label="$2"
  if pgrep -f "${pattern}" >/dev/null 2>&1; then
    local pids
    pids=$(pgrep -f "${pattern}" | tr '\n' ' ')
    log_warning "发现 ${label} 进程: ${pids}，发送 SIGTERM"
    kill -TERM ${pids} 2>/dev/null || true

    # 等待优雅退出（最多 12s），避免强杀打断数据库写入
    local waited=0
    while pgrep -f "${pattern}" >/dev/null 2>&1; do
      sleep 1
      waited=$((waited + 1))
      if [ "$waited" -ge 12 ]; then
        break
      fi
    done

    if pgrep -f "${pattern}" >/dev/null 2>&1; then
      pids=$(pgrep -f "${pattern}" | tr '\n' ' ')
      log_warning "${label} 仍在运行，发送 SIGKILL: ${pids}"
      kill -KILL ${pids} 2>/dev/null || true
      sleep 1
    fi
    if pgrep -f "${pattern}" >/dev/null 2>&1; then
      log_error "未能完全停止 ${label}，请手动检查"
    else
      log_success "已停止 ${label}"
    fi
  else
    log_info "未发现 ${label} 进程"
  fi
}

main() {
  echo "=== 🛑 地图全景系统停止脚本 ==="
  echo ""

  require_tools

  # 优雅停止：按端口终止（Vite 3000，后端 3002）
  kill_by_port 3000
  kill_by_port 3002

  # 补充兜底：按进程特征终止
  # Vite 开发服务器
  kill_by_pattern "(^|/)vite( |$)" "Vite 开发服务器"
  # Nodemon 热重载
  kill_by_pattern "nodemon" "Nodemon"
  # 直接运行的后端服务（避免遗漏）
  kill_by_pattern "node .*src/server.js" "Node 后端服务"
  # 并行启动器（如果有残留）
  kill_by_pattern "concurrently .*dev" "concurrently（开发启动器）"

  log_success "所有开发/测试相关进程已尝试停止完成"
}

main "$@"


