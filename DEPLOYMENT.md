# 地图全景系统部署指南

## 系统要求

- Node.js 16+ 
- npm 或 yarn

## 快速部署

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
cd client && npm install
cd ../server && npm install
```

### 2. 初始化数据库

```bash
cd server
node init-sqlite-data.js
```

### 3. 启动服务

```bash
# 开发模式（同时启动前端和后端）
npm run dev

# 或者分别启动
npm run dev:client  # 前端开发服务器
npm run dev:server  # 后端API服务器
```

### 4. 生产部署

```bash
# 构建前端
npm run build

# 启动后端服务
cd server
npm start
```

## 配置说明

### 环境变量 (server/.env)

```env
# 服务器配置
PORT=3002
NODE_ENV=development

# 数据库配置
DB_PATH=./data/panorama_map.db

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# 安全配置
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000

# 日志配置
LOG_LEVEL=info
```

## 数据存储

- **数据库**: SQLite (自动创建在 `server/data/panorama_map.db`)
- **文件存储**: `server/uploads/` 目录
- **配置文件**: `server/config/` 目录

## 特性

- ✅ 零依赖数据库（使用SQLite）
- ✅ 自动数据库初始化
- ✅ 示例数据预置
- ✅ 文件夹分类管理
- ✅ 全景图和视频点位支持
- ✅ KML文件导入
- ✅ 地图坐标系转换（WGS84/GCJ02）

## 目录结构

```
project/
├── client/          # 前端Vue应用
├── server/          # 后端Node.js应用
│   ├── data/        # SQLite数据库文件
│   ├── uploads/     # 上传文件存储
│   ├── config/      # 配置文件
│   └── src/         # 源代码
└── package.json     # 项目根配置
```

## 故障排除

### 数据库问题
- 删除 `server/data/panorama_map.db` 文件，重新运行初始化脚本

### 端口冲突
- 修改 `server/.env` 中的 `PORT` 配置
- 修改 `client/vite.config.js` 中的代理配置

### 文件上传问题
- 检查 `server/uploads/` 目录权限
- 确认 `MAX_FILE_SIZE` 配置合适

## 升级说明

从MySQL版本升级：
1. 备份原有上传文件
2. 按照本指南重新部署
3. 恢复上传文件到新的 `uploads/` 目录