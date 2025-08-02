# 🗺️ 地图全景系统

基于 Vue 3 + Leaflet + Pannellum 的地图全景查看系统，支持高德地图瓦片、坐标系转换和全景图管理功能。

## ✨ 核心功能

- 🗺️ **交互式地图** - 基于 Leaflet 的地图显示，支持高德地图瓦片
- 🔄 **坐标转换** - 支持 WGS84、GCJ02、BD09 坐标系精确转换
- 📸 **全景图管理** - 支持全景图的上传、编辑、删除和搜索
- 🌐 **360° 全景查看** - 基于 Pannellum 的全景图查看器
- 📱 **响应式设计** - 适配桌面端和移动端
- 🚀 **高性能** - 优化的图片加载和缓存策略

## 🛠️ 技术栈

**前端**
- Vue 3 + Vite + Pinia
- Leaflet (地图) + Pannellum (全景图)
- Element Plus + Axios

**后端**
- Node.js + Express
- MySQL + Multer + Sharp
- Joi + dotenv

## 🚀 快速开始

### 一键启动（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd mymap

# 一键启动（自动安装依赖、部署数据库、启动服务）
./start.sh
```

### 手动部署

```bash
# 1. 安装依赖
npm run install:all

# 2. 启动服务
npm run dev
```

## 🌐 访问地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api

## 📋 管理命令

```bash
# 项目管理
./start.sh              # 启动项目（前台模式）
./start.sh background    # 启动项目（后台模式）
./start.sh stop          # 停止项目
./start.sh status        # 查看状态

# 数据库管理
./manage-database.sh status    # 查看数据库状态
./manage-database.sh logs      # 查看数据库日志
./manage-database.sh backup    # 备份数据库
```

## 📖 使用说明

### 基本操作

1. **查看地图** - 访问 http://localhost:3000
2. **添加全景图** - 点击地图上的"添加"按钮
3. **查看全景图** - 点击地图标记点
4. **搜索功能** - 使用侧边栏搜索框

### API 接口

- `GET /api/panoramas` - 获取全景图列表
- `POST /api/panoramas` - 创建全景图
- `POST /api/panoramas/upload` - 上传全景图文件
- `GET /api/panoramas/bounds` - 根据地图边界获取全景图
- `GET /api/panoramas/nearby` - 获取附近的全景图

## 🔧 环境配置

编辑 `server/.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=asd123123123
DB_NAME=panorama_map

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# 安全配置
CORS_ORIGIN=http://localhost:3000
```

## 🏗️ 项目结构

```
mymap/
├── client/                   # 前端 Vue 项目
│   ├── src/
│   │   ├── components/       # 组件
│   │   ├── views/           # 页面
│   │   ├── store/           # 状态管理
│   │   └── api/             # 接口请求
├── server/                   # 后端 Express 项目
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 服务层
│   │   ├── models/          # 数据模型
│   │   └── routes/          # 路由
├── scripts/                  # 部署脚本
└── README.md
```

## 🔍 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   ./start.sh stop
   ./start.sh
   ```

2. **数据库连接失败**
   ```bash
   ./manage-database.sh status
   ./manage-database.sh restart
   ```

3. **依赖安装失败**
   ```bash
   rm -rf client/node_modules server/node_modules
   ./start.sh install
   ```

### 日志查看

```bash
# 应用日志
tail -f server.log
tail -f client.log

# 数据库日志
./manage-database.sh logs
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题请提交 Issue 或联系开发者。