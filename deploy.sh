#!/usr/bin/env bash
set -euo pipefail

# 一键 Docker 部署脚本
# 支持自定义外部端口: ./deploy.sh [host_port]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] 未检测到 docker，请先安装 Docker 后重试" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] 未检测到 docker compose，请安装 Docker Compose v2 (docker compose)" >&2
  exit 1
fi

if [ $# -ge 1 ]; then
  export MYMAP_PORT="$1"
  echo "[deploy] 使用自定义端口映射: ${MYMAP_PORT} -> 3002"
elif [ -z "${MYMAP_PORT:-}" ]; then
  export MYMAP_PORT="50000"
  echo "[deploy] 未提供端口参数，使用默认端口: ${MYMAP_PORT} -> 3002"
else
  echo "[deploy] 使用环境变量 MYMAP_PORT=${MYMAP_PORT} -> 3002"
fi

echo "[deploy] 构建并启动容器 (使用 ${COMPOSE_FILE})..."
docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo "[deploy] 部署完成，可通过 http://127.0.0.1:${MYMAP_PORT}/ 访问"
echo "[deploy] 数据卷: mymap-db (SQLite) / mymap-uploads (文件上传)"
