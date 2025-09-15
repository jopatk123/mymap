#!/usr/bin/env bash
set -euo pipefail

# 构建本项目所需的本地镜像，并将其导出为 tar.gz 文件
# 以便在隔离网络或受限服务器上上传并加载。

OUT_DIR="images"
MAP_IMAGE_NAME="mymap:latest"
NGINX_IMAGE_NAME="nginx:1.25-alpine"
DOCKERFILE_PATH="docker/Dockerfile"
BUILD_CONTEXT="."

# 可选的临时构建上下文：在离线构建时包含主机的 server/node_modules
BUILD_CTX_EXTRA_DIR="build_context_extra"
BUILD_CTX_EXTRA_NODE_MODULES="$BUILD_CTX_EXTRA_DIR/server_node_modules"

# 如果设置为 1，在脚本结束后保留临时的 build_context_extra（便于调试）
KEEP_BUILD_CONTEXT=${KEEP_BUILD_CONTEXT:-0}

# 清理函数：除非 KEEP_BUILD_CONTEXT=1，否则会删除临时的 build_context_extra
cleanup() {
  rc=$?
  if [ "$KEEP_BUILD_CONTEXT" != "1" ] && [ -d "$BUILD_CTX_EXTRA_DIR" ]; then
    echo "Cleaning up temporary build context: $BUILD_CTX_EXTRA_DIR"
    rm -rf "$BUILD_CTX_EXTRA_DIR" || true
  else
    if [ -d "$BUILD_CTX_EXTRA_DIR" ]; then
      echo "Leaving temporary build context intact: $BUILD_CTX_EXTRA_DIR (KEEP_BUILD_CONTEXT=$KEEP_BUILD_CONTEXT)"
    fi
  fi
  return $rc
}

# 确保在脚本退出或出错时运行清理函数
trap cleanup EXIT

mkdir -p "$OUT_DIR"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--no-compress] [--single|--multi]

This script will:
  - build the local image $MAP_IMAGE_NAME from $DOCKERFILE_PATH
  - pull $NGINX_IMAGE_NAME if not present locally
  - by default create a single archive containing both images (single mode)
  - use --multi to save each image to its own archive and generate sha256 checksums

Environment variables honored as build-args: HTTP_PROXY, HTTPS_PROXY, NO_PROXY, ALPINE_MIRROR

Other environment variables:
  USE_LOCAL_CLIENT=1    # if set, will pass to docker build so Dockerfile can copy a local client/dist
  USE_HOST_PROXY=1     # if set, proxy env values on host are forwarded into docker build
  KEEP_BUILD_CONTEXT=1  # if set, temporary build_context_extra is left on disk

EOF
}

COMPRESS=true
# 默认：将两个镜像打包为单个归档文件
SINGLE=true
while [[ ${#} -gt 0 ]]; do
  case $1 in
    -h|--help) usage; exit 0 ;;
    --no-compress) COMPRESS=false; shift ;;
    --single) SINGLE=true; shift ;;
    --multi|--separate) SINGLE=false; shift ;;
    *) echo "Unknown arg: $1"; usage; exit 2 ;;
  esac
done

command -v docker >/dev/null 2>&1 || { echo "docker not found in PATH. Install Docker and try again." >&2; exit 3; }
  # 支持使用本地预构建的 client/dist，而不是在镜像内构建
  if [ "${USE_LOCAL_CLIENT:-0}" = "1" ]; then
    echo "USE_LOCAL_CLIENT=1 detected - will skip client build inside image and copy local client/dist"

  fi
echo "Checking Docker daemon..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon does not appear to be running or you don't have permissions to access it." >&2
  exit 4
fi

# 如果本地存在 server/node_modules，则将其复制到 build_context_extra 中以包含
# 在离线构建的上下文中，从而避免修改 .dockerignore。
if [ -d "server/node_modules" ] && [ "$(ls -A server/node_modules)" ]; then
  echo "Detected local server/node_modules - copying into $BUILD_CTX_EXTRA_NODE_MODULES for offline build"
  mkdir -p "$BUILD_CTX_EXTRA_NODE_MODULES"
  # 如果可用，使用 rsync 进行更快/更可靠的复制；否则回退到 cp -a
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete server/node_modules/ "$BUILD_CTX_EXTRA_NODE_MODULES/"
  else
    cp -a server/node_modules/. "$BUILD_CTX_EXTRA_NODE_MODULES/"
  fi
else
  echo "No local server/node_modules detected; will rely on Dockerfile/server-deps stage to install production deps during build (may require network)"
fi

# 默认情况下清除代理相关的构建参数，避免继承到容器内部不可达的本地代理。
# 如果希望显式使用主机代理，请设置 USE_HOST_PROXY=1
# 默认：清除常见代理构建参数，避免 docker build 继承仅主机可用的代理
build_args=()
DOCKER_BUILD_NETWORK=""
if [ "${USE_HOST_PROXY:-0}" = "1" ]; then
  for var in HTTP_PROXY HTTPS_PROXY NO_PROXY ALPINE_MIRROR; do
    val="${!var:-}"
    if [ -n "$val" ]; then
  # 如果代理指向 localhost，则为 docker build 启用主机网络
      if [[ "$var" =~ ^HTTP_PROXY$|^HTTPS_PROXY$ ]] && printf "%s" "$val" | grep -Eq "127\\.0\\.1|localhost"; then
        echo "Detected $var pointing to localhost; enabling --network=host for docker build and passing proxy values"
        DOCKER_BUILD_NETWORK="--network=host"
      fi
      build_args+=( --build-arg "$var=$val" )
    fi
  done
else
  # 显式清空这些变量，避免构建继承只能在主机访问的本地代理
  build_args+=( --build-arg "HTTP_PROXY=" --build-arg "HTTPS_PROXY=" --build-arg "NO_PROXY=" )
fi

echo "Building image: $MAP_IMAGE_NAME"
set -x
docker_build_cmd=(docker build)
if [ -n "$DOCKER_BUILD_NETWORK" ]; then
  docker_build_cmd+=("$DOCKER_BUILD_NETWORK")
fi
docker_build_cmd+=( -t "$MAP_IMAGE_NAME" -f "$DOCKERFILE_PATH" )

# 将 USE_LOCAL_CLIENT 传递给 docker build，以便 Dockerfile 根据需要处理
if [ "${USE_LOCAL_CLIENT:-0}" = "1" ]; then
  build_args+=( --build-arg "USE_LOCAL_CLIENT=1" )
  # Dockerfile 当前识别 SKIP_CLIENT_BUILD，用于在 client-builder 阶段跳过客户端构建。
  # 如果调用者希望使用已放入构建上下文的预构建 client/dist，可传递 SKIP_CLIENT_BUILD=1 以便捷使用。
  build_args+=( --build-arg "SKIP_CLIENT_BUILD=1" )
fi

# 允许调用者跳过服务端的 npm install（当 server/node_modules 已包含在构建上下文中或进行完全离线构建时很有用）。
if [ "${SKIP_SERVER_NPM_INSTALL:-0}" = "1" ]; then
  echo "SKIP_SERVER_NPM_INSTALL=1 detected - passing through to docker build"
  build_args+=( --build-arg "SKIP_SERVER_NPM_INSTALL=1" )
fi

if [ ${#build_args[@]} -gt 0 ]; then
  docker_build_cmd+=( "${build_args[@]}" )
fi
docker_build_cmd+=("$BUILD_CONTEXT")

# 以安全的方式执行命令数组（保留参数边界）
"${docker_build_cmd[@]}"
set +x

echo "Ensuring nginx image exists locally: $NGINX_IMAGE_NAME"
if ! docker image inspect "$NGINX_IMAGE_NAME" >/dev/null 2>&1; then
  echo "Pulling $NGINX_IMAGE_NAME"
  docker pull "$NGINX_IMAGE_NAME"
else
  echo "$NGINX_IMAGE_NAME already present locally"
fi

save_image() {
  local img="$1" out_name="$2"
  tmp_tar="$OUT_DIR/${out_name}.tar"
  out_file="$OUT_DIR/${out_name}.tar.gz"

  echo "Saving image $img -> $tmp_tar"
  docker save -o "$tmp_tar" "$img"

  if [ "$COMPRESS" = true ]; then
    echo "Compressing -> $out_file"
    gzip -9 -c "$tmp_tar" > "$out_file"
    rm -f "$tmp_tar"
    arch="$out_file"
  else
    arch="$tmp_tar"
  fi

  echo "Generating checksum for $arch"
  sha256sum "$arch" > "${arch}.sha256"
  echo "$arch"
}

echo "Exporting images to $OUT_DIR"
if [ "$SINGLE" = true ]; then
  tmp_tar="$OUT_DIR/mymap_images.tar"
  out_file="$OUT_DIR/mymap_images.tar.gz"

  echo "Saving images $MAP_IMAGE_NAME and $NGINX_IMAGE_NAME -> $tmp_tar"
  docker save -o "$tmp_tar" "$MAP_IMAGE_NAME" "$NGINX_IMAGE_NAME"

  if [ "$COMPRESS" = true ]; then
    echo "Compressing -> $out_file"
    gzip -9 -c "$tmp_tar" > "$out_file"
    rm -f "$tmp_tar"
    arch="$out_file"
  else
    arch="$tmp_tar"
  fi

  echo
  echo "Created file:"
  echo "  $arch"
  echo "(sha256 checksum generation skipped in --single mode)"
else
  map_out=$(save_image "$MAP_IMAGE_NAME" "mymap_latest")
  nginx_out=$(save_image "$NGINX_IMAGE_NAME" "nginx_1.25-alpine")

  echo
  echo "Created files:"
  echo "  $map_out"
  echo "  ${map_out}.sha256"
  echo "  $nginx_out"
  echo "  ${nginx_out}.sha256"
fi

if [ "$SINGLE" = true ]; then
  cat <<EOF
Next steps (on the target server):

  1) Upload the files in the "$OUT_DIR" directory to the server.
  2) On the server, run:

     docker load -i ${OUT_DIR}/mymap_images.tar.gz

     # then start the stack (no build on server)
     docker compose up -d

  Note: If you used --no-compress, drop the .gz suffix above.

EOF
else
  cat <<EOF
Next steps (on the target server):

  1) Upload the files in the "$OUT_DIR" directory to the server.
  2) On the server, run:

     docker load -i ${OUT_DIR}/mymap_latest.tar.gz
     docker load -i ${OUT_DIR}/nginx_1.25-alpine.tar.gz

     # then start the stack (no build on server)
     docker compose up -d

  Note: If you used --no-compress, drop the .gz suffix above.

EOF
fi

exit 0
