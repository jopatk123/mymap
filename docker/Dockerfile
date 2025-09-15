# 多阶段构建：先构建客户端，安装服务器依赖，然后组装运行时镜像

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG ALPINE_MIRROR

# 1) 构建客户端（Vue + Vite）
FROM node:20-bookworm-slim AS client-builder
ARG SKIP_CLIENT_BUILD=0
# 将工作目录设为 client，以便在此阶段将开发依赖（如 vite）安装到 client/node_modules
WORKDIR /app/client

# 确保在此构建阶段 npm 会安装 devDependencies
ENV NPM_CONFIG_PRODUCTION=false

# 复制客户端源代码并安装所有依赖（包括 devDependencies），然后构建
# 先复制整个 client 可以避免后续的 COPY 覆盖 node_modules
COPY client/ ./
# 在本阶段安装 devDependencies 并在同一层中完成构建
# 导出大写和小写的代理环境变量，确保工具可以识别它们
ENV NPM_CONFIG_PRODUCTION=false
ENV npm_config_production=false
ENV HTTP_PROXY=${HTTP_PROXY:-}
ENV HTTPS_PROXY=${HTTPS_PROXY:-}
ENV NO_PROXY=${NO_PROXY:-}
ENV http_proxy=${HTTP_PROXY:-}
ENV https_proxy=${HTTPS_PROXY:-}
ENV no_proxy=${NO_PROXY:-}

# 仅在提供非本地代理时配置 npm 代理设置。如果代理指向本地主机（例如 127.0.0.1），
# 除非 docker build 使用主机网络，否则在构建容器内不可用。为避免 ECONNREFUSED，
# 我们对本地主机代理值跳过 npm 代理配置，允许构建直接运行，或者调用方在部署时
# 通过构建参数传递 --network=host。
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

# 2) 安装服务器运行时依赖
FROM node:20-bookworm-slim AS server-deps
WORKDIR /app
# 为 sharp 及其它需要编译的本地模块安装系统依赖
ARG SKIP_SERVER_NPM_INSTALL=0
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        libc6-dev \
        libvips-dev \
        pkg-config \
        libglib2.0-dev \
        libcairo2-dev \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev \
        libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置 npm 配置以使用 sharp 的预编译二进制文件，避免从源码编译
ENV npm_config_sharp_binary_host="https://github.com/lovell/sharp-libvips/releases/download" \
    npm_config_sharp_libvips_binary_host="https://github.com/lovell/sharp-libvips/releases/download"

COPY server/package*.json server/
RUN set -eux; \
    if [ "${SKIP_SERVER_NPM_INSTALL}" = "1" ]; then \
        echo "SKIP_SERVER_NPM_INSTALL=1 - skipping 'npm ci' for server"; \
        mkdir -p /app/server/node_modules; \
    else \
        npm ci --omit=dev --prefix server --prefer-offline --no-audit; \
    fi

# 3) 运行时镜像
FROM node:20-bookworm-slim AS runtime
WORKDIR /app/server

ENV NODE_ENV=production \
    PORT=3002

# 复制服务器源码
COPY server /app/server

# 从 deps 阶段复制服务器生产环境的 node_modules
COPY --from=server-deps /app/server/node_modules /app/server/node_modules

# 如果构建上下文包含预先在宿主机安装的 server/node_modules，
# 将其复制到镜像中以支持完全离线构建（在构建容器内无法运行 npm 的场景）。
# 这会静默覆盖来自 server-deps 的 node_modules。这样做是安全的，因为该目录只会在
# 调用方有意提供时存在于上下文中（我们保持默认行为不变）。
## 支持离线构建：如果构建上下文在 build_context_extra/server_node_modules 下包含
## 预装依赖，则将其复制到镜像中。这样可以避免把 server/node_modules 添加到 .dockerignore，
## 并允许调用方在 docker build 之前通过创建该目录来选择启用此行为。
COPY build_context_extra/server_node_modules /app/server/node_modules

# 复制客户端构建产物
#COPY --from=client-builder /app/client/dist /app/client/dist

# 如果调用方传递了 SKIP_CLIENT_BUILD=1 并在构建上下文中提供了 client/dist，
# 从上下文复制以覆盖构建产物。这允许在 client/dist 预先准备好的离线构建场景。
ARG SKIP_CLIENT_BUILD=1
COPY client/dist /app/client/dist

# 准备持久化目录
RUN mkdir -p /app/server/uploads/kml \
    /app/server/uploads/panoramas \
    /app/server/uploads/thumbnails \
    /app/server/uploads/videos \
    /app/server/data \
    /app/server/logs

EXPOSE 3002

CMD ["node", "src/server.js"]


