#!/usr/bin/env bash

set -euo pipefail

# 简介：
# - 一键构建并以 docker-compose 方式运行后端（内含前端构建产物）
# - 支持二次执行自动更新（拉代码、重建镜像、零停机式重启）
# 依赖：docker >= 20.x, docker compose plugin

APP_NAME="mymap"
IMAGE_NAME="mymap:latest"
COMPOSE_FILE="docker/docker-compose.yml"

log()  { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[SUCCESS]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERROR]\033[0m $*"; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少命令: $1"
    exit 1
  fi
}

detect_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi
  err "未检测到 docker compose，请安装 Docker 并启用 compose 插件"
  exit 1
}

main() {
  log "检查依赖..."
  need_cmd git
  need_cmd docker

  local DC
  DC=$(detect_compose)
  log "使用 compose 命令: $DC"

  log "同步代码..."
  if [ -d .git ]; then
    git fetch --all --prune
    # 优先保持在 main 分支
    if git rev-parse --abbrev-ref HEAD | grep -q "main"; then
      git pull --rebase
    else
      warn "当前不在 main 分支，跳过强制切换"
      git pull --rebase || true
    fi
  else
    warn "未检测到 .git 目录，跳过拉取"
  fi

  log "构建镜像: $IMAGE_NAME"
  docker build -t "$IMAGE_NAME" -f docker/Dockerfile .

  log "启动/更新服务: $APP_NAME"
  $DC -f "$COMPOSE_FILE" up -d --remove-orphans

  log "等待健康检查..."
  sleep 2
  if ! $DC -f "$COMPOSE_FILE" ps | grep -q "(healthy)"; then
    warn "容器尚未通过健康检查，可稍后通过以下命令查看："
    echo "  $DC -f $COMPOSE_FILE ps"
  fi

  ok "部署完成。API: http://<服务器IP>:3002/api"
}

main "$@"


