#!/usr/bin/env bash
set -euo pipefail

cd /app

if [ -z "${DB_PATH:-}" ]; then
  DB_PATH="server/data/panorama_map.db"
fi
DB_DIR="$(dirname "${DB_PATH}")"
mkdir -p "${DB_DIR}"
export DB_PATH

if [ -z "${UPLOAD_DIR:-}" ]; then
  UPLOAD_DIR="uploads"
fi
mkdir -p "${UPLOAD_DIR}" \
         "${UPLOAD_DIR}/kml" \
         "${UPLOAD_DIR}/kml-basemap" \
         "${UPLOAD_DIR}/panoramas" \
         "${UPLOAD_DIR}/thumbnails" \
         "${UPLOAD_DIR}/videos"

mkdir -p server/logs

if [ "${SKIP_DB_INIT:-0}" != "1" ] && [ ! -f "${DB_PATH}" ]; then
  echo "[entrypoint] Initializing SQLite database at ${DB_PATH}"
  (cd server && node init-sqlite-data.js)
else
  echo "[entrypoint] Skipping database initialization (file exists or SKIP_DB_INIT=1)."
fi

cd /app/server
exec "$@"
