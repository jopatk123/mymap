# Multi-stage build: build client, install server deps, then assemble runtime image

# 1) Build client (Vue + Vite)
FROM node:18-bookworm-slim AS client-builder
WORKDIR /app

# Install client deps using clean install for reproducibility
COPY client/package*.json client/
RUN npm ci --prefix client

# Copy client source and build
COPY client client
RUN npm run build --prefix client

# 2) Install server production dependencies
FROM node:18-bookworm-slim AS server-deps
WORKDIR /app

COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server

# 3) Runtime image
FROM node:18-bookworm-slim AS runtime
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


