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
  need_cmd docker

  local DC
  DC=$(detect_compose)
  log "使用 compose 命令: $DC"

  # 已移除自动 git 拉取逻辑；部署脚本不会再尝试拉取或切换分支
  log "跳过自动代码同步：已移除 git 操作"

  log "构建镜像: $IMAGE_NAME"
  docker build -t "$IMAGE_NAME" -f docker/Dockerfile .

  log "启动/更新服务: $APP_NAME (Node + Nginx)"
  # 不自动移除孤立容器，避免误删同宿主机上其他容器
  $DC -f "$COMPOSE_FILE" up -d

  log "等待健康检查..."
  sleep 3
  $DC -f "$COMPOSE_FILE" ps || true

  # 简单连通性探测（本机端口 50000，经 Nginx 反代）
  if command -v curl >/dev/null 2>&1; then
    if curl -sSf -m 8 "http://127.0.0.1:50000/api/health" >/dev/null 2>&1; then
      ok "部署完成。入口: http://<服务器IP>:50000  | 健康检查: http://<服务器IP>:50000/api/health"
    else
      warn "健康检查请求未通过，可能仍在启动中或发生错误。将输出关键容器的最近日志："
      echo
      echo "==== docker compose ps ===="
      $DC -f "$COMPOSE_FILE" ps || true
      echo
      echo "==== mymap (Node) logs (last 200) ===="
      $DC -f "$COMPOSE_FILE" logs --no-color --tail=200 mymap || true
      echo
      echo "==== mymap-nginx logs (last 100) ===="
      $DC -f "$COMPOSE_FILE" logs --no-color --tail=100 nginx || true
      echo
      warn "可重试访问: http://<服务器IP>:50000/api/health"
    fi
  else
    ok "部署完成。入口: http://<服务器IP>:50000"
  fi
}

main "$@"


