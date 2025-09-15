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
  # Collect proxy/mirror vars from environment to pass as build args when present
  BUILD_ARGS=( )
  [ -n "${http_proxy:-}" ] && BUILD_ARGS+=(--build-arg HTTP_PROXY="$http_proxy")
  [ -n "${https_proxy:-}" ] && BUILD_ARGS+=(--build-arg HTTPS_PROXY="$https_proxy")
  [ -n "${no_proxy:-}" ] && BUILD_ARGS+=(--build-arg NO_PROXY="$no_proxy")
  [ -n "${ALPINE_MIRROR:-}" ] && BUILD_ARGS+=(--build-arg ALPINE_MIRROR="$ALPINE_MIRROR")

  # If proxy targets localhost, docker build needs host network so build steps can reach it
  # 初始化为数组，避免在后续作为数组展开时出现参数拼接错误
  BUILD_NETWORK=()
  if [ -n "${http_proxy:-}" ] && printf "%s" "$http_proxy" | grep -Eq "127\\.0\\.0\\.1|localhost"; then
    BUILD_NETWORK=(--network host)
    warn "Proxy points to localhost - using host network for docker build so build can reach the proxy"
  fi

  # 确保 build_context_extra 目录存在（占位），以避免 Dockerfile 中的 COPY 在没有预装依赖的情况下失败。
  # 当需要提供预装的 server_node_modules 以支持离线构建时，调用者可以在仓库根目录创建该目录并放入内容；
  # 否则默认使用由 server-deps 阶段生成的 node_modules。
  mkdir -p build_context_extra/server_node_modules

  # 构造命令数组以保留各参数边界，便于打印与调试
  CMD=(docker build -t "$IMAGE_NAME" -f docker/Dockerfile "${BUILD_ARGS[@]}" "${BUILD_NETWORK[@]}" .)
  # 打印将要执行的命令（以可重现的方式显示每个参数）
  printf '[INFO] 执行镜像构建命令: '
  printf '%q ' "${CMD[@]}"
  printf '\n'
  "${CMD[@]}"

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


