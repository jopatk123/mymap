# 地图全景系统

基于 Vue 3 + Leaflet + Pannellum 的地图全景查看系统，支持高德地图瓦片、坐标系转换和全景图管理功能。

## 功能特性

- 🗺️ **地图显示**: 基于 Leaflet 的交互式地图，支持高德地图瓦片
- 🔄 **坐标转换**: 支持 WGS84、GCJ02、BD09 坐标系之间的精确转换
- 📸 **全景图管理**: 全景图的增删改查、批量上传、搜索功能
- 🌐 **全景查看**: 基于 Pannellum 的 360° 全景图查看器
- 📱 **响应式设计**: 支持桌面端和移动端访问
- 🚀 **高性能**: 优化的图片加载和缓存策略

## 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 快速的前端构建工具
- **Leaflet** - 开源地图库
- **Pannellum** - WebGL 全景图查看器
- **Element Plus** - Vue 3 UI 组件库
- **Pinia** - Vue 状态管理
- **Axios** - HTTP 客户端

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 应用框架
- **MySQL** - 关系型数据库
- **Multer** - 文件上传中间件
- **Sharp** - 图像处理库
- **Joi** - 数据验证库

## 项目结构

```
panorama-map-project/
├── client/                   # 前端 Vue 项目
│   ├── src/
│   │   ├── components/       # 组件
│   │   ├── views/           # 页面
│   │   ├── composables/     # 组合式 API
│   │   ├── utils/           # 工具函数
│   │   ├── store/           # 状态管理
│   │   └── api/             # 接口请求
│   └── package.json
├── server/                   # 后端 Express 项目
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 服务层
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── middleware/      # 中间件
│   │   ├── utils/           # 工具函数
│   │   └── config/          # 配置文件
│   └── package.json
├── scripts/                  # 部署脚本
└── docs/                     # 项目文档
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- npm >= 8.0.0

### 安装部署

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd panorama-map-project
   ```

2. **一键部署（推荐）**
   ```bash
   # 开发环境
   ./scripts/deploy.sh --dev
   
   # 生产环境
   ./scripts/deploy.sh --prod
   ```

3. **手动部署**
   ```bash
   # 安装依赖
   npm run install:all
   
   # 配置数据库
   mysql -u root -p < scripts/init-db.sql
   
   # 配置环境变量
   cp server/.env.example server/.env
   # 编辑 server/.env 文件，配置数据库连接等信息
   
   # 启动开发服务
   npm run dev
   ```

### 环境配置

编辑 `server/.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=panorama_map

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# 安全配置
CORS_ORIGIN=http://localhost:3000
```

## 使用说明

### 基本操作

1. **查看地图**: 访问 http://localhost:3000 查看地图界面
2. **添加全景图**: 点击"添加"按钮上传全景图文件
3. **查看全景图**: 点击地图上的标记点查看全景图
4. **搜索功能**: 使用侧边栏搜索框查找全景图

### API 接口

主要 API 端点：

- `GET /api/panoramas` - 获取全景图列表
- `POST /api/panoramas` - 创建全景图
- `GET /api/panoramas/:id` - 获取全景图详情
- `PUT /api/panoramas/:id` - 更新全景图
- `DELETE /api/panoramas/:id` - 删除全景图
- `POST /api/panoramas/upload` - 上传全景图文件
- `GET /api/panoramas/bounds` - 根据地图边界获取全景图
- `GET /api/panoramas/nearby` - 获取附近的全景图

详细 API 文档请访问：http://localhost:3001/api

### 坐标系说明

系统支持三种坐标系：

- **WGS84**: GPS 坐标系，国际标准
- **GCJ02**: 高德坐标系，中国标准
- **BD09**: 百度坐标系

系统会自动进行坐标转换，确保地图显示的准确性。

## 开发指南

### 前端开发

```bash
cd client
npm run dev    # 启动开发服务器
npm run build  # 构建生产版本
```

### 后端开发

```bash
cd server
npm run dev    # 启动开发服务器（nodemon）
npm start      # 启动生产服务器
```

### 数据库管理

```bash
# 初始化数据库
mysql -u root -p < scripts/init-db.sql

# 备份数据库
mysqldump -u root -p panorama_map > backup.sql

# 恢复数据库
mysql -u root -p panorama_map < backup.sql
```

## 部署说明

### 开发环境

```bash
./scripts/deploy.sh --dev
```

### 生产环境

```bash
./scripts/deploy.sh --prod
```

生产环境建议使用 PM2 进行进程管理：

```bash
npm install -g pm2
pm2 start server/src/server.js --name panorama-map
pm2 startup
pm2 save
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 MySQL 服务是否启动
   - 验证 `.env` 文件中的数据库配置
   - 确认数据库用户权限

2. **文件上传失败**
   - 检查 `uploads` 目录权限
   - 确认文件大小不超过限制
   - 验证文件类型是否支持

3. **地图不显示**
   - 检查网络连接
   - 确认高德地图瓦片服务可访问
   - 验证坐标数据格式

4. **全景图无法查看**
   - 检查 Pannellum 库是否正确加载
   - 确认全景图文件路径正确
   - 验证图片格式是否支持

### 日志查看

```bash
# 查看应用日志
tail -f server/logs/access.log
tail -f server/logs/error.log

# 查看 PM2 日志
pm2 logs panorama-map
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至：[your-email@example.com]

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 基础地图功能
- 全景图管理功能
- 坐标系转换功能
- 文件上传功能