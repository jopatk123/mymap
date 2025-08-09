## 地图全景系统（Vue3 + Express + SQLite）

一个支持全景图与地理要素（KML/点/线/面）管理与展示的全栈项目：前端使用 Vue3 + Vite + Leaflet + Pannellum，后端使用 Express + SQLite，内置上传、样式管理与批量处理能力。

### 技术栈
- **前端**: Vue 3, Vite, Element Plus, Leaflet, Pannellum, Pinia, Vue Router, Sass
- **后端**: Node.js (Express), SQLite/SQLite3, Multer, Sharp, xml2js, Joi, Helmet, Morgan

### 目录结构
```text
mymap/
  client/            # 前端（Vite + Vue3）
  server/            # 后端（Express + SQLite）
  start.sh           # 一键安装/初始化/启动脚本（SQLite 版本）
```

更多细分请参考仓库内实际文件（如 `client/src/**`, `server/src/**`, `server/uploads/**`, `server/data/**`）。

## 环境要求
- Node.js ≥ 16（推荐 LTS）
- npm（或自行替换为 pnpm/yarn）
- Linux/macOS/WSL2 环境均可（脚本与端口示例以 Linux 为基准）

## 快速开始（开发环境，本机）
使用一键脚本完成依赖安装、数据库初始化与启动（前后端分别运行，适合本地开发）。

```bash
chmod +x ./start.sh
./start.sh
```

脚本功能摘要：
- 检查 Node.js 版本（需 ≥ 16）
- 安装根目录、`client/`、`server/` 依赖
- 在 `server/` 下执行 `node init-sqlite-data.js` 初始化 SQLite 数据库
- 并行启动前后端开发服务
  - 前端: `http://localhost:3000`
  - 后端: `http://localhost:3002`

脚本参数：
- `--help`/`-h`: 显示帮助
- `--init-only`: 仅初始化数据库，不启动服务
- `--no-deps`: 跳过依赖安装

示例：
```bash
./start.sh --init-only
./start.sh --no-deps
```

## 手动启动（可选，开发环境）
如需手动控制每一步，可按下列流程：

1) 安装依赖
```bash
npm run install:all

```

2) 初始化数据库（SQLite）
```bash
cd server
node init-sqlite-data.js
```

3) 启动开发模式
```bash
# 在项目根目录并行启动前后端
npm run dev

# 或分别启动
npm run dev:client   
npm run dev:server   
```

## 环境变量（后端 `server/.env`）
后端配置位于 `server/src/config/index.js`，可通过 `.env` 覆盖。示例：

```env
# 服务器
PORT=3002
NODE_ENV=development

# 数据库（SQLite 文件路径，相对 server/）
DB_PATH=./data/panorama_map.db

# 上传
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800

# 安全与跨域
JWT_SECRET=your-secret
CORS_ORIGIN=http://localhost:3000

# 日志
LOG_LEVEL=info
```

说明：
- 后端默认监听 `3002` 端口。
- 默认数据库文件位于 `server/data/panorama_map.db`。
- 上传目录默认为 `server/uploads/`，包含 `kml/`, `panoramas/`, `thumbnails/`, `videos/` 等子目录。
 - 跨域默认允许 `http://localhost:3000`（与 Vite 默认开发端口保持一致），前端使用 Vite 代理到 `3002`。可在 `.env` 中通过 `CORS_ORIGIN` 覆盖。

## 前端开发说明（本机）
- 本地开发地址：`http://localhost:3000`
- Vite 代理：`/api -> http://localhost:3002`（见 `client/vite.config.js`）
- `@` 别名指向 `client/src`（见 `client/vite.config.js`）

常用脚本（`client/package.json`）：
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

构建产物在 `client/dist`。生产部署时可由任意静态服务（Nginx/OSS/静态容器）托管。

## 后端服务说明
- 入口：`server/src/server.js`
- 应用：`server/src/app.js`
- 配置：`server/src/config/index.js`
- 日志：`server/src/utils/logger.js`
- API 路由：`server/src/routes/**`，控制器位于 `server/src/controllers/**`

常用脚本（`server/package.json`）：
```json
{
  "scripts": {
    "dev": "nodemon --exec 'node --trace-deprecation src/server.js'",
    "start": "node src/server.js"
  }
}
```

后端启动后日志将打印 API 文档与健康检查地址（示例）：
```
API文档: http://localhost:3002/api
健康检查: http://localhost:3002/api/health
```

## 根目录脚本
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev",
    "build": "cd client && npm run build",
    "install:all": "npm install && cd client && npm install && cd ../server && npm install"
  }
}
```

## 数据与上传目录
- 数据库文件：`server/data/panorama_map.db`
- 上传根目录：`server/uploads/`
  - `kml/`：KML 文件
  - `panoramas/`：全景原图
  - `thumbnails/`：缩略图
  - `videos/`：视频
  

## 生产部署（Docker + Nginx 反向代理，50000 端口）

本仓库内置一键 Docker 部署脚本，使用 Nginx 监听 50000 端口反代到 Node（3002）。

### 前置要求
- 服务器已安装 Docker 与 Docker Compose 插件
- 已放通服务器防火墙/安全组的 50000 端口

### 部署命令
```bash
chmod +x ./deploy.sh
./deploy.sh
```

部署完成后访问：
- 前端与 API：`http://<服务器IP>:50000`
- 健康检查：`http://<服务器IP>:50000/api/health`

### 目录与镜像
- Node 应用镜像：`mymap:latest`（由 `docker/Dockerfile` 构建）
- 编排文件：`docker/docker-compose.yml`
- Nginx 配置：`docker/nginx/default.conf`

### 常见问题
- 502 Bad Gateway：
  - 检查容器是否运行：`docker compose -f docker/docker-compose.yml ps`
  - 查看 Node 日志：`docker logs mymap`
  - 查看 Nginx 日志：`docker logs mymap-nginx`
  - 确认 `http://127.0.0.1:50000/api/health` 在服务器本机可访问
  - 确认安全组/防火墙已放通 50000 端口

### 上线 HTTPS（可选）
当前为纯 HTTP。若需 HTTPS，可在 Nginx 增配 443 监听与证书（Let’s Encrypt/自签名等），或前置云负载均衡。
确保后端对这些目录具有读写权限（Linux 下可使用 `chmod -R 755 server/uploads`）。




