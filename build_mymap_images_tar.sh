#!/usr/bin/env bash
set -euo pipefail

# Builds the local images required by this project and exports them to tar.gz files
# so they can be uploaded and loaded on an air-gapped/restricted server.

OUT_DIR="images"
MAP_IMAGE_NAME="mymap:latest"
NGINX_IMAGE_NAME="nginx:1.25-alpine"
DOCKERFILE_PATH="docker/Dockerfile"
BUILD_CONTEXT="."

mkdir -p "$OUT_DIR"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--no-compress]

This script will:
  - build the local image $MAP_IMAGE_NAME from $DOCKERFILE_PATH
  - pull $NGINX_IMAGE_NAME if not present locally
  - save both images to $OUT_DIR as tar.gz (or tar if --no-compress)
  - produce sha256 checksums for each archive

Environment variables honored as build-args: HTTP_PROXY, HTTPS_PROXY, NO_PROXY, ALPINE_MIRROR

EOF
}

COMPRESS=true
while [[ ${#} -gt 0 ]]; do
  case $1 in
    -h|--help) usage; exit 0 ;;
    --no-compress) COMPRESS=false; shift ;;
    *) echo "Unknown arg: $1"; usage; exit 2 ;;
  esac
done

command -v docker >/dev/null 2>&1 || { echo "docker not found in PATH. Install Docker and try again." >&2; exit 3; }

echo "Checking Docker daemon..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon does not appear to be running or you don't have permissions to access it." >&2
  exit 4
fi

# By default we clear proxy build-args so the build won't inherit a
# localhost proxy that is unreachable from inside the container.
# If you explicitly want to use the host proxy, set USE_HOST_PROXY=1
build_args=( --build-arg "HTTP_PROXY=" --build-arg "HTTPS_PROXY=" --build-arg "NO_PROXY=" )
DOCKER_BUILD_NETWORK=""
if [ "${USE_HOST_PROXY:-0}" = "1" ]; then
  for var in HTTP_PROXY HTTPS_PROXY NO_PROXY ALPINE_MIRROR; do
    val="${!var:-}"
    if [ -n "$val" ]; then
      # If proxy points to localhost, enable host networking
      if [[ "$var" =~ ^HTTP_PROXY$|^HTTPS_PROXY$ ]] && printf "%s" "$val" | grep -Eq "127\\.0\\.0\\.1|localhost"; then
        echo "Detected $var pointing to localhost; enabling --network=host for docker build and passing proxy values"
        DOCKER_BUILD_NETWORK="--network=host"
      fi
      build_args+=( --build-arg "$var=$val" )
    fi
  done
fi

echo "Building image: $MAP_IMAGE_NAME"
set -x
docker_build_cmd=(docker build)
if [ -n "$DOCKER_BUILD_NETWORK" ]; then
  docker_build_cmd+=("$DOCKER_BUILD_NETWORK")
fi
docker_build_cmd+=( -t "$MAP_IMAGE_NAME" -f "$DOCKERFILE_PATH" )
# append build-args if any
if [ ${#build_args[@]} -gt 0 ]; then
  docker_build_cmd+=( "${build_args[@]}" )
fi
docker_build_cmd+=("$BUILD_CONTEXT")

# Execute the command array
eval "${docker_build_cmd[@]}"
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
map_out=$(save_image "$MAP_IMAGE_NAME" "mymap_latest")
nginx_out=$(save_image "$NGINX_IMAGE_NAME" "nginx_1.25-alpine")

echo
echo "Created files:"
echo "  $map_out"
echo "  ${map_out}.sha256"
echo "  $nginx_out"
echo "  ${nginx_out}.sha256"

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

exit 0
