# 地图全景项目架构设计

## 项目概述
基于Vue 3 + Vite + Leaflet + Pannellum的地图全景查看系统，支持高德地图瓦片、坐标系转换、全景图点位管理和全景图查看功能。

## 整体项目结构
```
panorama-map-project/
├── client/                   # 前端 Vue 项目
├── server/                   # 后端 Express 项目  
├── docs/                     # 项目文档
│   ├── api.md               # 接口文档
│   ├── coordinate-system.md  # 坐标系转换说明
│   └── deployment.md        # 部署文档
├── scripts/                  # 自动化脚本
│   ├── deploy.sh            # 部署脚本
│   └── init-db.js           # 数据库初始化脚本
├── docker/                   # Docker 配置
├── .gitignore               
└── README.md                
```

## 前端项目结构 (client/)

### 核心目录结构
```
client/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── panorama-icons/       # 全景图标资源
├── src/
│   ├── api/                  # 接口请求层
│   │   ├── index.js         # Axios 配置
│   │   ├── map.js           # 地图相关接口
│   │   ├── panorama.js      # 全景图相关接口
│   │   └── coordinate.js    # 坐标转换接口
│   ├── assets/
│   │   ├── images/
│   │   │   ├── map-markers/ # 地图标记图标
│   │   │   └── panorama/    # 全景图相关图片
│   │   ├── styles/
│   │   │   ├── reset.scss
│   │   │   ├── variables.scss
│   │   │   ├── global.scss
│   │   │   └── map.scss     # 地图专用样式
│   │   └── fonts/
│   ├── components/
│   │   ├── common/          # 通用组件
│   │   │   ├── Loading/
│   │   │   ├── Modal/
│   │   │   └── Toast/
│   │   └── map/             # 地图相关组件
│   │       ├── MapContainer/     # 地图容器组件
│   │       ├── PanoramaMarker/   # 全景图标记组件
│   │       ├── PanoramaModal/    # 全景图信息弹窗
│   │       ├── PanoramaViewer/   # 全景图查看器
│   │       ├── CoordinateConverter/ # 坐标转换工具组件
│   │       └── MapControls/      # 地图控制组件
│   ├── composables/         # 组合式API
│   │   ├── useMap.js        # 地图相关逻辑
│   │   ├── usePanorama.js   # 全景图相关逻辑
│   │   ├── useCoordinate.js # 坐标转换逻辑
│   │   └── useGeolocation.js # 地理定位逻辑
│   ├── utils/
│   │   ├── coordinate.js    # 坐标系转换工具
│   │   ├── map-utils.js     # 地图工具函数
│   │   ├── panorama-utils.js # 全景图工具函数
│   │   └── storage.js       # 本地存储
│   ├── store/               # 状态管理
│   │   ├── index.js
│   │   ├── map.js           # 地图状态
│   │   ├── panorama.js      # 全景图状态
│   │   └── app.js           # 应用状态
│   ├── views/
│   │   ├── Layout/
│   │   ├── Map/             # 地图主页面
│   │   │   ├── index.vue    # 地图主界面
│   │   │   └── components/  # 页面级组件
│   │   └── Admin/           # 管理后台（可选）
│   │       ├── PanoramaManage.vue # 全景图管理
│   │       └── MapManage.vue      # 地图管理
│   ├── router/
│   ├── App.vue
│   └── main.js
├── package.json
├── vite.config.js
└── README.md
```

### 核心技术栈配置

#### package.json 主要依赖
```json
{
  "dependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "axios": "^1.4.0",
    "leaflet": "^1.9.0",
    "pannellum": "^2.5.6",
    "proj4": "^2.9.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.0",
    "vite": "^4.3.0",
    "sass": "^1.62.0"
  }
}
```

## 后端项目结构 (server/)

```
server/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── index.js
│   │   ├── db.js
│   │   └── map.js           # 地图相关配置
│   ├── routes/
│   │   ├── index.js
│   │   ├── panorama.routes.js # 全景图路由
│   │   ├── map.routes.js      # 地图路由
│   │   └── coordinate.routes.js # 坐标转换路由
│   ├── controllers/
│   │   ├── panorama.controller.js
│   │   ├── map.controller.js
│   │   └── coordinate.controller.js
│   ├── services/
│   │   ├── panorama.service.js
│   │   ├── map.service.js
│   │   └── coordinate.service.js # 坐标转换服务
│   ├── models/
│   │   ├── panorama.model.js    # 全景图数据模型
│   │   └── map-point.model.js   # 地图点位模型
│   ├── middleware/
│   ├── utils/
│   │   ├── coordinate-transform.js # 坐标转换工具
│   │   └── file-upload.js         # 文件上传工具
│   └── uploads/             # 上传文件存储
│       └── panoramas/       # 全景图文件
├── package.json
└── README.md
```

## 核心功能模块设计

### 1. 坐标系转换模块
- **支持坐标系**: WGS84 (GPS) ↔ GCJ02 (高德) ↔ BD09 (百度)
- **转换场景**: 
  - 高德瓦片服务 (GCJ02) → Leaflet显示 (WGS84)
  - 用户点击坐标转换
  - 全景图点位坐标转换

### 2. 地图显示模块
- **底图**: 高德地图瓦片服务
- **地图库**: Leaflet
- **功能**: 缩放、平移、标记点显示、点击事件

### 3. 全景图管理模块
- **存储**: 全景图文件 + 元数据(坐标、标题、描述等)
- **显示**: 地图上的全景图标记点
- **交互**: 点击标记显示全景图信息弹窗

### 4. 全景图查看模块
- **查看器**: Pannellum
- **功能**: 360度全景查看、缩放、旋转
- **集成**: 模态框形式集成到地图页面

## 数据库设计

### 全景图表 (panoramas)
```sql
CREATE TABLE panoramas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,    -- WGS84坐标
  longitude DECIMAL(11, 8) NOT NULL,   -- WGS84坐标
  gcj02_lat DECIMAL(10, 8),            -- GCJ02坐标(高德)
  gcj02_lng DECIMAL(11, 8),            -- GCJ02坐标(高德)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 开发优先级

### 第一阶段：基础框架
1. 项目初始化和基础配置
2. Leaflet地图集成
3. 高德瓦片服务接入
4. 基础坐标转换功能

### 第二阶段：核心功能
1. 全景图数据模型和API
2. 地图标记点显示
3. 全景图信息弹窗
4. Pannellum全景查看器集成

### 第三阶段：功能完善
1. 全景图管理后台
2. 批量上传功能
3. 地图交互优化
4. 性能优化

## 技术难点和解决方案

### 1. 坐标系转换精度
- 使用proj4.js库进行精确转换
- 建立坐标转换缓存机制
- 提供转换精度验证工具

### 2. 高德瓦片服务集成
- 自定义Leaflet瓦片层
- 处理瓦片URL模板
- 实现瓦片加载错误处理

### 3. 全景图加载性能
- 全景图文件压缩优化
- 懒加载机制
- 缓存策略

### 4. 移动端适配
- 响应式地图布局
- 触摸手势支持
- 全景图移动端查看优化

这个架构设计充分考虑了你的需求，包括坐标系转换、高德地图集成、全景图管理和Pannellum查看器。接下来我可以帮你开始实现具体的代码框架。