# Multi-stage build: build client, install server deps, then assemble runtime image

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG ALPINE_MIRROR

# 1) Build client (Vue + Vite)
FROM node:20-bookworm-slim AS client-builder
# Use client as working dir to install devDependencies (vite) into client/node_modules
WORKDIR /app/client

# Ensure npm installs devDependencies in this build stage
ENV NPM_CONFIG_PRODUCTION=false

# Copy client source and install all dependencies (including devDependencies), then build
# Copying entire client first avoids later COPY overwriting node_modules
COPY client/ ./
# Ensure devDependencies are installed in this stage and build in one layer
# Export both uppercase and lowercase proxy env vars so tools can see them
ENV NPM_CONFIG_PRODUCTION=false
ENV npm_config_production=false
ENV HTTP_PROXY=${HTTP_PROXY:-}
ENV HTTPS_PROXY=${HTTPS_PROXY:-}
ENV NO_PROXY=${NO_PROXY:-}
ENV http_proxy=${HTTP_PROXY:-}
ENV https_proxy=${HTTPS_PROXY:-}
ENV no_proxy=${NO_PROXY:-}

# Configure npm proxy settings only when a non-local proxy is provided. If the
# proxy points to localhost (e.g. 127.0.0.1), it will not be usable inside the
# build container unless docker build uses host networking. To avoid ECONNREFUSED
# we skip setting npm proxy for localhost values and let the build either run
# directly or the caller can pass --network=host via build args in deploy.
RUN set -eux; \
        if [ -n "$HTTP_PROXY" ]; then \
            if printf "%s" "$HTTP_PROXY" | grep -Eq "127\\.0\\.0\\.1|localhost"; then \
                echo "Detected HTTP_PROXY pointing to localhost - not configuring npm proxy inside container"; \
                npm config delete proxy || true; npm config delete https-proxy || true; \
            else \
                npm config set proxy "$HTTP_PROXY"; \
                npm config set https-proxy "${HTTPS_PROXY:-$HTTP_PROXY}"; \
            fi; \
        fi; \
        npm set progress=false; npm config set fund false; \
        npm ci --include=dev --no-audit --no-fund --silent; \
        npx --yes vite build

# 2) Install server production dependencies
FROM node:20-bookworm-slim AS server-deps
WORKDIR /app

COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server

# 3) Runtime image
FROM node:20-bookworm-slim AS runtime
WORKDIR /app/server

ENV NODE_ENV=production \
    PORT=3002

# Copy server source
COPY server /app/server

# Copy server production node_modules from deps stage
COPY --from=server-deps /app/server/node_modules /app/server/node_modules

# Copy client build artifacts
COPY --from=client-builder /app/client/dist /app/client/dist

# Prepare persistent directories
RUN mkdir -p /app/server/uploads/kml \
    /app/server/uploads/panoramas \
    /app/server/uploads/thumbnails \
    /app/server/uploads/videos \
    /app/server/data \
    /app/server/logs

EXPOSE 3002

CMD ["node", "src/server.js"]


