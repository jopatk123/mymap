# Panorama Map 平台

> 基于 Vue 3 与 Node.js 构建的全景地图管理平台，支持全景照片、视频点位与 KML 数据的统一管理、展示与部署。本文档涵盖项目概览、快速上手指南以及部署、测试与协作规范。

## ✨ 核心特性

- **交互式地图**：基于 Leaflet 与 markercluster，实现点位聚合、筛选与地图样式自定义。
- **全景浏览**：整合 Pannellum，全景图支持多分辨率加载、热点跳转与 EXIF 自动解析。
- **多媒体资产管理**：统一管理全景图、视频点位、KML/KMZ 文件，提供批量导入、分类与排序能力。
- **灵活的样式与配置**：点位样式、初始视角、底图等配置可视化管理，并通过 WebSocket 实时下发。
- **完善的日志与调试**：接入访问/错误/操作日志，提供响应快照与数据库巡检脚本，便于排错。
- **容器化部署**：多阶段 Docker 构建、docker compose 一键部署，SQLite 数据与上传资源通过卷持久化。

## 🏗 技术架构

| 层次 | 技术栈 | 说明 |
| --- | --- | --- |
| 前端 | Vue 3、Vite、Pinia、Vue Router、Element Plus、Leaflet、Pannellum | 组合式 API 与模块化目录，支持地图/全景组件与多媒体工具集 |
| 后端 | Node.js 20、Express、ws、Multer、Sharp、Joi、Helmet、CORS | RESTful API、文件上传处理、配置广播与安全中间件 |
| 数据 | SQLite、轻量迁移脚本、文件系统上传目录 | 默认本地数据库，可根据需要切换至其他关系型数据库 |
| 测试与质量 | Vitest、@vue/test-utils、Jest、ESLint、Prettier | 前后端单元测试、代码规范与格式化脚本 |
| 部署 | Docker (多阶段)、docker compose、deploy/start/stop 脚本 | 容器化生产部署与本地一键启动支持 |

## 📂 目录结构

```
.
├── client/                 # 前端源代码（Vue 3 + Vite）
├── server/                 # 后端源代码（Express + SQLite）
├── server/uploads/         # 开发模式下的多媒体上传目录
├── data/                   # 默认 SQLite 数据库存储路径
├── deploy.sh               # Docker 部署脚本
├── start.sh / stop.sh      # 本地启动/停止辅助脚本
├── Dockerfile              # 多阶段 Docker 构建文件
├── docker-compose.yml      # docker compose 配置
├── AI编程技术规范.md        # AI 协作者工程规范
├── LICENSE                 # MIT 许可
└── README.md               # 项目说明（本文档）
```

## 🚀 快速开始

### 前置要求

- Node.js **>= 20 < 21**
- npm 9+（或兼容的 pnpm / yarn，默认使用 npm）
- 可选：Docker 24+ 与 Docker Compose v2（用于容器化部署）

### 安装依赖

```bash
# 安装根、前端、后端依赖
npm run install:all
```

### 启动开发环境

```bash
# 并行启动前端 (Vite, http://localhost:3000) 与后端 (Express, http://localhost:3002)
npm run dev
```

首个启动流程会自动：
1. 在 `server/data/` 下创建 SQLite 数据库并初始化表结构；
2. 创建上传与日志目录；
3. 监听 WebSocket 以推送配置更新。

如需单独启动，可在 `client/` 与 `server/` 目录分别执行 `npm run dev`。

### 关闭开发环境

```bash
./stop.sh
```

该脚本会清理 3000 与 3002 端口的残留进程。

## 🧪 测试与质量

```bash
npm run lint            # ESLint + Prettier 检查
npm run format          # Prettier 自动格式化
cd client && npm run test        # 前端单元测试 (Vitest)
cd server && npm run test        # 后端单元测试 (Jest)
cd client && npm run test:coverage   # 前端覆盖率
cd server && npm run test:coverage   # 后端覆盖率
```

建议在提交代码前依次运行 lint 与相关测试，确保构建稳定。

## 🔧 可用脚本速览

| 位置 | 命令 | 功能 |
| --- | --- | --- |
| 根目录 | `npm run dev` | 同时启动前后端开发服务器 |
| 根目录 | `npm run build` | 构建前端生产包（输出至 `client/dist`） |
| 根目录 | `npm run lint` / `npm run lint:fix` | 代码规范检查 / 自动修复 |
| 根目录 | `npm run format` | Prettier 全仓库格式化 |
| client/ | `npm run dev` / `npm run build` / `npm run preview` | Vite 脚本 |
| client/ | `npm run test` / `npm run test:watch` / `npm run test:coverage` | 前端测试脚本 |
| server/ | `npm run dev` | 使用 Nodemon 热重载后端服务 |
| server/ | `npm run start` | 生产模式启动后端 |
| server/ | `npm run test` / `npm run test:watch` / `npm run test:coverage` | 后端测试脚本 |
| server/ | `node init-sqlite-data.js` | 手动初始化/修复 SQLite 数据库 |
| server/ | `node check-database.js` | 查看数据表与统计信息 |

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3002` | 后端服务监听端口 |
| `DB_PATH` | `./data/panorama_map.db` | SQLite 数据库路径；容器中会自动映射为绝对路径 |
| `UPLOAD_DIR` | `uploads` | 上传目录根路径 |
| `CORS_ORIGIN` | `*` | 允许访问的前端域名列表（生产环境请收紧） |
| `MAX_FILE_SIZE` | `52428800` | 单个上传文件大小限制（字节，默认 50MB） |
| `ALLOWED_FILE_TYPES` | 见 `server/src/config/index.js` | 允许上传的 MIME 类型 |
| `JWT_SECRET` | `default-secret-key` | 鉴权密钥（若启用认证） |
| `LOG_LEVEL` | `info` | 日志级别 |
| `VITE_API_BASE_URL` | （可选，默认通过 `/api` 代理） | 前端向后端发送 HTTP 请求时使用的基础地址（例如 `http://localhost:3002`）。 |
| `VITE_WS_BASE_URL` | 自动推断 | WebSocket 根地址（例如 `ws://localhost:3002`），显式设置以在仅 HTTP 传输时避免端口不一致。 |
| `VITE_WS_PATH` | 空 | WebSocket 路径前缀，服务端自定义握手路径时设置（例如 `/socket`）。 |
| `VITE_BACKEND_HOST` | `localhost`（开发回退） | Vite 开发模式下推断 WebSocket 地址时使用的主机名。 |
| `VITE_BACKEND_PORT` | `3002`（开发回退） | Vite 开发模式下推断 WebSocket 地址时使用的端口。 |

> 建议将上述变量写入 `.env` 文件，并在部署环境通过密钥管理服务注入。

## 🗄 数据与日志

- 数据库文件默认存放在 `server/data/panorama_map.db`；容器模式下挂载至 `mymap_data` 卷。
- 上传资源位于 `server/uploads/`，包含 `kml/`、`kml-basemap/`、`panoramas/`、`videos/`、`thumbnails/` 等子目录。
- 日志输出在 `server/logs/`：
  - `access.log`（及滚动备份）
  - `error.log`（结构化 JSON）
  - `operation.log`（关键操作审计）
  - `response-debug.log`（开发模式下捕获重要 API 请求/响应）

## 📦 Docker 部署

```bash
# 一键构建并启动容器（默认映射 50000 -> 3002）
./deploy.sh [host_port]

# 或手动执行
docker compose up -d --build
```

构建产物说明：
1. `client` 阶段构建前端静态文件；
2. `server` 阶段安装后端生产依赖；
3. 运行阶段复制前端 `dist` 与后端代码，并执行 `docker-entrypoint.sh`：
   - 归一化 `DB_PATH`
   - 创建上传目录与日志目录
   - 首次启动时初始化 SQLite 数据库

容器对外暴露端口 `3002`，可通过 `MYMAP_PORT` 环境变量自定义宿主机端口。

## 📚 文档与协作规范

- 《`AI编程技术规范.md`》：多代理协作、技术基线、代码风格与部署流程的统一约定。
- `docs/` 目录可扩展架构说明、API 文档、环境配置清单与运维手册。
- 建议对变更提交 ADR（Architecture Decision Record），确保历史决策可追溯。

## 🤝 贡献指南

1. Fork & Clone 仓库，创建 `feature/xxx` 或 `fix/xxx` 分支。
2. 完成开发并更新/新增测试与文档。
3. 运行 `npm run lint` 与相关测试，确保通过。
4. 提交 PR 时附带：变更摘要、验证步骤、潜在风险与后续计划。

## 📄 许可证

本项目遵循 [MIT License](./LICENSE)。欢迎自由使用、修改与分发，但请保留原始版权声明。
