# KML 底图功能实现文档

## 功能概述

本功能实现了 KML 底图的上传、管理和区域筛选功能，包括：

1. **KML 底图上传**：在管理界面添加"添加 KML 底图"按钮
2. **KML 底图文件夹**：在文件树中添加专用的 KML 底图文件夹（不可删除）
3. **区域选择**：提供圆形区域和自定义区域选择功能
4. **点位筛选**：根据选择的区域显示 KML 底图中的点位
5. **数据导出**：支持导出筛选后的点位数据为 CSV、KML、JSON 格式

## 文件结构

### 前端组件

```
client/src/
├── components/
│   ├── admin/
│   │   └── KMLBaseMapButton.vue                 # KML底图上传按钮
│   └── map/
│       ├── area-selector/
│       │   └── AreaControls.vue                 # 区域选择控制组件
│       └── kml-basemap/
│           ├── KMLBaseMapFolder.vue             # KML底图文件夹组件
│           └── KMLDataExporter.vue              # 数据导出对话框
├── composables/
│   ├── use-kml-basemap.js                       # KML底图管理逻辑
│   ├── use-area-selector.js                     # 区域选择逻辑
│   └── use-kml-export.js                        # 数据导出逻辑
├── services/
│   ├── kml-basemap-service.js                   # KML底图服务
│   ├── area-calculation-service.js              # 区域计算服务
│   └── kml-export-service.js                    # 数据导出服务
└── store/
    └── kml-basemap.js                           # KML底图状态管理
```

### 后端 API

```
server/src/
├── routes/
│   └── kml-basemap.js                           # KML底图API路由
└── utils/
    └── init-directories.js                      # 目录初始化工具
```

## 功能特性

### 1. KML 底图上传

- 支持拖拽上传和点击选择
- 文件类型验证（只接受.kml 文件）
- 文件大小限制（10MB）
- 自动解析 KML 文件中的点位信息
- 上传进度显示和错误处理

### 2. 区域选择

#### 圆形区域

- 可设置半径（50-50000 米）
- 提供常用半径预设（500m、1000m、2000m、5000m、10000m）
- 点击地图确定圆心位置
- 实时显示圆形区域边界

#### 自定义区域

- 多边形绘制功能
- 支持复杂形状区域
- 双击完成绘制
- 可自定义区域名称

### 3. 点位筛选

- 默认情况下 KML 底图点位不显示
- 根据选择的区域动态显示点位
- 支持多个区域同时选择
- 实时更新可见点位数量
- 使用高效的地理计算算法

### 4. 数据导出

#### 支持格式

- **CSV**：Excel 兼容格式，包含 BOM 头支持中文
- **KML**：Google Earth 兼容格式
- **JSON**：程序友好格式

#### 导出信息

- 点位名称、描述、坐标、海拔
- 来源文件信息
- 导出时间戳
- 数据统计信息

### 5. 文件管理

- 文件列表显示（名称、大小、点位数量、上传时间）
- 文件详情查看（点位数据预览）
- 文件下载功能
- 文件删除功能
- 统计信息显示

## 技术实现

### 前端技术栈

- **Vue 3**：组合式 API
- **Element Plus**：UI 组件库
- **Pinia**：状态管理
- **Leaflet**：地图显示和交互
- **Vite**：构建工具

### 后端技术栈

- **Express.js**：Web 框架
- **Multer**：文件上传处理
- **xmldom**：KML 文件解析
- **文件系统**：本地文件存储

### 核心算法

#### 点在圆形区域判断

使用 Haversine 公式计算两点间距离，判断点位是否在圆形区域内。

#### 点在多边形区域判断

使用射线法（Ray Casting Algorithm）判断点位是否在多边形内部。

#### 地理坐标计算

- 经纬度到米的转换
- 圆形路径点生成
- 多边形面积计算

## 安装和配置

### 前端依赖

现有依赖已足够，无需安装额外包。

### 后端依赖

需要添加以下依赖：

```bash
cd server
npm install xmldom
```

### 目录初始化

服务器启动时会自动创建必要的上传目录：

- `server/uploads/kml-basemap/`

### API 集成

在服务器主文件中添加路由：

```javascript
const kmlBaseMapRoutes = require('./routes/kml-basemap');
app.use('/api/kml-basemap', kmlBaseMapRoutes);
```

## API 接口

### 1. 上传 KML 文件

```
POST /api/kml-basemap/upload
Content-Type: multipart/form-data
Body: { kml: File }
```

### 2. 获取文件列表

```
GET /api/kml-basemap/files
```

### 3. 获取文件点位

```
GET /api/kml-basemap/:fileId/points
```

### 4. 下载文件

```
GET /api/kml-basemap/:fileId/download
```

### 5. 删除文件

```
DELETE /api/kml-basemap/:fileId
```

### 6. 导出数据

```
POST /api/kml-basemap/export
Content-Type: application/json
Body: { points: Array, format: String, filename: String }
```

## 使用说明

### 1. 上传 KML 底图

1. 在管理界面点击"添加 KML 底图"按钮
2. 选择或拖拽 KML 文件到上传区域
3. 点击"上传文件"完成上传
4. 系统自动解析文件并显示点位统计

### 2. 选择区域显示点位

1. 在地图界面找到区域选择按钮组
2. 点击"圆形区域"设置半径后在地图上点击确定圆心
3. 或点击"自定义区域"在地图上绘制多边形区域
4. 区域内的 KML 点位将自动显示

### 3. 导出筛选数据

1. 选择区域后点击"导出"按钮
2. 在导出对话框中选择格式和文件名
3. 点击"导出文件"下载数据

### 4. 管理 KML 文件

1. 在文件树的"KML 底图"文件夹中查看已上传的文件
2. 点击文件可查看详情和点位预览
3. 使用操作按钮下载或删除文件

## 注意事项

1. **文件格式**：只支持标准 KML 格式文件
2. **文件大小**：单个文件限制 10MB
3. **坐标系统**：使用 WGS84 坐标系统（EPSG:4326）
4. **性能优化**：大量点位时建议分批处理
5. **浏览器兼容**：支持现代浏览器，需要支持 ES6+

## 扩展功能

可以进一步扩展的功能：

- 支持 KMZ 压缩格式
- 添加点位样式自定义
- 支持点位编辑功能
- 添加区域保存和加载功能
- 实现协作编辑功能
- 集成更多地图底图

## 故障排除

### 常见问题

1. **上传失败**：检查文件格式和大小限制
2. **点位不显示**：确认已选择区域且区域内有点位
3. **导出失败**：检查是否有可导出的数据
4. **文件解析错误**：确认 KML 文件格式正确

### 调试方法

1. 查看浏览器控制台错误信息
2. 检查网络请求响应
3. 验证后端日志输出
4. 确认文件权限设置
