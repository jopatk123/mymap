# Multi-stage build: build client, install server deps, then assemble runtime image

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG ALPINE_MIRROR

# 1) Build client (Vue + Vite)
FROM node:20-bookworm-slim AS client-builder
ARG SKIP_CLIENT_BUILD=0
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
        if [ "${SKIP_CLIENT_BUILD}" = "1" ]; then \
            echo "SKIP_CLIENT_BUILD=1 detected - skipping client npm install and build"; \
            exit 0; \
        fi; \
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

# If the build context contains a preinstalled server/node_modules (from host),
# copy it into the image to support fully-offline builds where npm cannot run
# inside the build container. This will silently overwrite the server-deps copy.
# It's safe because the directory will only exist in the context when intentionally
# provided by the caller (we keep the default behavior unchanged).
## Support offline builds: if the build context contains preinstalled dependencies
## under build_context_extra/server_node_modules, copy them into the image. This
## avoids adding server/node_modules to .dockerignore and lets callers opt-in by
## creating that directory before docker build.
COPY build_context_extra/server_node_modules /app/server/node_modules

# Copy client build artifacts
COPY --from=client-builder /app/client/dist /app/client/dist

# If the caller passed SKIP_CLIENT_BUILD=1 and provided client/dist in the build context,
# copy it from the context to overwrite the built artifacts. This allows offline builds
# where client/dist is prepared beforehand.
ARG SKIP_CLIENT_BUILD=0
COPY client/dist /app/client/dist

# Prepare persistent directories
RUN mkdir -p /app/server/uploads/kml \
    /app/server/uploads/panoramas \
    /app/server/uploads/thumbnails \
    /app/server/uploads/videos \
    /app/server/data \
    /app/server/logs

EXPOSE 3002

CMD ["node", "src/server.js"]


