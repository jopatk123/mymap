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

## 快速开始（推荐）
使用一键脚本完成依赖安装、数据库初始化与启动。

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

## 手动启动（可选）
如需手动控制每一步，可按下列流程：

1) 安装依赖
```bash
npm run install:all
# 等价于：
# npm install
# (cd client && npm install)
# (cd server && npm install)
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
npm run dev:client   # http://localhost:3000
npm run dev:server   # http://localhost:3002
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

## 前端开发说明
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

确保后端对这些目录具有读写权限（Linux 下可使用 `chmod -R 755 server/uploads`）。

## 生产部署（示例）
1) 构建前端并部署静态资源
```bash
cd client
npm run build
# 将 dist/ 交由 Nginx/静态服务器托管
```

2) 启动后端服务（建议使用 PM2 或系统服务）
```bash
cd server
npm ci --only=production
npm run start
# 或：pm2 start src/server.js --name mymap-api
```

3) 反向代理（Nginx 示例）
```nginx
location /api/ {
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_pass http://127.0.0.1:3002/;
}
```

## 常见问题（FAQ）
- **端口占用（3000/3002）**：脚本会尝试清理；如仍被占用，可手动执行 `lsof -i :3000`/`:3002` 后 `kill`。
- **Sharp 安装失败**：确保系统具备构建工具与依赖库（如 `libvips`）；可参考 Sharp 官方文档。
- **SQLite/`sqlite3` 相关错误**：删除 `server/node_modules` 后重新安装，或确保网络可用以下载预编译二进制。
- **跨域问题**：检查 `server/.env` 中 `CORS_ORIGIN` 是否与前端地址一致，或在开发阶段保持使用 Vite 代理。
- **上传失败（类型/大小）**：检查 `server/src/config/index.js` 中 `allowedTypes` 与 `MAX_FILE_SIZE` 配置。

## 许可协议
本项目遵循仓库内 `LICENSE` 文件所述的开源协议。


