#!/usr/bin/env bash
set -euo pipefail

cd /app

# Normalize DB_PATH to absolute path under /app/server if not provided or provided as relative
if [ -z "${DB_PATH:-}" ]; then
  DB_PATH="/app/server/data/panorama_map.db"
elif [ "${DB_PATH#*/}" = "${DB_PATH}" ]; then
  # if DB_PATH is relative (e.g., server/data/panorama_map.db or ./data/panorama_map.db), anchor it to /app
  case "${DB_PATH}" in
    /*) : ;; # already absolute
    server/*) DB_PATH="/app/${DB_PATH}" ;;
    ./*) DB_PATH="/app/server/${DB_PATH#./}" ;;
    data/*) DB_PATH="/app/server/${DB_PATH}" ;;
    *) DB_PATH="/app/${DB_PATH}" ;;
  esac
fi
DB_DIR="$(dirname "${DB_PATH}")"
mkdir -p "${DB_DIR}"
export DB_PATH

if [ -z "${UPLOAD_DIR:-}" ]; then
  UPLOAD_DIR="uploads"
fi
# Ensure upload directories are created under server/ so they match the app's cwd (/app/server)
mkdir -p "server/${UPLOAD_DIR}" \
         "server/${UPLOAD_DIR}/kml" \
         "server/${UPLOAD_DIR}/kml-basemap" \
         "server/${UPLOAD_DIR}/panoramas" \
         "server/${UPLOAD_DIR}/thumbnails" \
         "server/${UPLOAD_DIR}/videos"

mkdir -p server/logs

if [ "${SKIP_DB_INIT:-0}" != "1" ] && [ ! -f "${DB_PATH}" ]; then
  echo "[entrypoint] Initializing SQLite database at ${DB_PATH}"
  (cd server && node init-sqlite-data.js)
else
  echo "[entrypoint] Skipping database initialization (file exists or SKIP_DB_INIT=1)."
fi

cd /app/server
exec "$@"
