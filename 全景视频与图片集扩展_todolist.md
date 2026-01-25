# 全景图与视频点位功能分析与图片集扩展 TodoList

## 一、现有功能实现概览（全景图与视频点位）

### 1) 后端（上传、存储、接口）
- 全景图路由与控制器：通过接口完成列表、按边界查询、上传、编辑、删除、可见性与批量操作。入口集中在 [server/src/routes/panoramas.routes.js](server/src/routes/panoramas.routes.js) 与 [server/src/controllers/panorama](server/src/controllers/panorama)。
- 视频点位路由与控制器：支持上传、列表、按边界查询、编辑、删除、可见性与批量操作。入口在 [server/src/routes/video-points.routes.js](server/src/routes/video-points.routes.js) 与 [server/src/controllers/video-point](server/src/controllers/video-point)。
- 统一点位聚合接口：将全景图与视频点位合并成统一点位列表与边界查询结果，新增 `type` 区分。实现见 [server/src/routes/points.routes.js](server/src/routes/points.routes.js) 与 [server/src/controllers/points.controller.js](server/src/controllers/points.controller.js)。
- 上传处理：
  - 全景图：图片上传至 uploads/panoramas，生成缩略图至 uploads/thumbnails，构建 `/uploads/...` 访问路径。处理逻辑见 [server/src/middleware/upload/handlers.js](server/src/middleware/upload/handlers.js)。
  - 视频点位：视频上传至 uploads/videos，构建 `/uploads/...` 路径，文件类型与大小校验见 [server/src/middleware/upload/storage.js](server/src/middleware/upload/storage.js) 与 [server/src/middleware/upload/handlers.js](server/src/middleware/upload/handlers.js)。
- 文件清理与事务一致性：在创建或删除失败时，会尝试清理物理文件，避免孤儿文件。见 [server/src/services/panorama/panorama-mutation.service.js](server/src/services/panorama/panorama-mutation.service.js) 与 [server/src/services/video-point.service.js](server/src/services/video-point.service.js)。
- 静态资源托管：上传文件统一挂载为 `/uploads`，由后端静态资源服务暴露，见 [server/src/app.js](server/src/app.js)。

### 2) 前端（上传、地图展示、详情查看）
- 全景图上传：
  - 组件与流程：上传弹窗 [client/src/components/common/UploadDialog.vue](client/src/components/common/UploadDialog.vue)，图片选择区 [client/src/components/common/PanoramaUploadArea.vue](client/src/components/common/PanoramaUploadArea.vue)。
  - EXIF GPS：前端通过 `usePanoramaProcessor` 读取图片 GPS 并回填经纬度，见 [client/src/composables/use-file-processor.js](client/src/composables/use-file-processor.js)。
  - 上传接口：调用 [client/src/api/panorama.js](client/src/api/panorama.js) 中的 `uploadPanoramaImage`。
- 视频点位上传：
  - 组件与流程：上传弹窗 [client/src/components/common/VideoUploadDialog.vue](client/src/components/common/VideoUploadDialog.vue)，视频选择区 [client/src/components/common/VideoUploadArea.vue](client/src/components/common/VideoUploadArea.vue)。
  - 坐标输入：视频无法自动提取 GPS，要求手动输入。
  - 上传接口：调用 [client/src/api/video.js](client/src/api/video.js) 的 `uploadVideo`。
- 地图展示与点位点击：
  - 地图页入口 [client/src/views/Map/index.vue](client/src/views/Map/index.vue)，数据加载由 [client/src/composables/map-page/data-loader.js](client/src/composables/map-page/data-loader.js) 拉取统一点位接口。
  - 标记生成：根据 `type` 区分全景图与视频点位，生成不同 marker，逻辑见 [client/src/utils/map-utils.js](client/src/utils/map-utils.js) 与 [client/src/composables/use-map-markers.js](client/src/composables/use-map-markers.js)。
  - 点位点击行为：全景图打开全景查看器，视频点位打开视频弹窗，逻辑见 [client/src/composables/use-map-interactions.js](client/src/composables/use-map-interactions.js)。
- 详情查看：
  - 全景图：Pannellum 查看器页面 [client/src/views/PanoramaViewer.vue](client/src/views/PanoramaViewer.vue) 与地图内弹窗 [client/src/components/map/panorama/PanoramaViewer.vue](client/src/components/map/panorama/PanoramaViewer.vue)。
  - 视频点位：弹窗与播放器 [client/src/components/map/VideoModal.vue](client/src/components/map/VideoModal.vue)。

## 二、数据库与配置

### 1) 运行时数据库（SQLite）
- 配置入口：数据库路径来源于 `DATABASE_URL` 或 `DB_PATH`，默认数据库文件路径为 data/panorama_map.db，见 [server/src/config/index.js](server/src/config/index.js)。
- 连接与健康检查：SQLite 连接、完整性检查、WAL 模式配置见 [server/src/config/database/connection.js](server/src/config/database/connection.js)。
- 表结构初始化：基础表结构由初始化脚本创建，包括 panoramas 与 video_points，见 [server/src/config/database/schema.js](server/src/config/database/schema.js)。
- 访问层：业务模型使用 SQLiteAdapter 直接执行 SQL，见 [server/src/models/panorama.model.js](server/src/models/panorama.model.js) 与 [server/src/models/video-point.model.js](server/src/models/video-point.model.js)。

### 2) Prisma 与会话存储
- Prisma 主要用于 Session 持久化与鉴权相关数据，见 [server/src/app.js](server/src/app.js) 与 [server/prisma/schema.prisma](server/prisma/schema.prisma)。
- Prisma schema 中包含 `ownerId` 等多用户字段；运行时的 SQLite 业务表由自定义 schema 初始化，需以迁移保证字段一致性（例如 `owner_id` 的存在性）。这一点在扩展功能时要避免字段不一致导致的读写异常。

## 三、图片集功能扩展建议（非代码层面）

### 1) 核心产品模型
- 新增“图片集点位”作为独立媒体类型，不混用现有全景图或视频点位，避免语义与展示冲突。
- 图片集作为“一个地理点位 + 多张图片内容”的组合：
  - 点位有唯一经纬度、封面图、描述、可见性、归属文件夹。
  - 子图片具备顺序、原图路径、缩略图、EXIF 元数据（可选）。
- 地图展示以图片集为一个点位；详情查看提供图片浏览（网格/轮播/全屏）。

### 2) 数据库层原则
- 新增主表（图片集）与子表（图片项）：
  - 主表包含坐标、封面图、数量、可见性、排序、归属等字段。
  - 子表包含图片路径、缩略图路径、顺序、可选 EXIF 信息。
- 仍沿用 WGS84 与 GCJ02 坐标双存储策略，保证地图显示一致性。
- 删除图片集应级联清理子图片记录及物理文件；失败需保证数据库与文件系统的一致性。

### 3) 后端接口与文件处理
- 新增图片集上传接口：支持多文件上传，允许选择“单地点多图”。
- 上传后生成缩略图与封面图；封面可默认使用首张图片并允许后续调整。
- 创建、更新、删除、批量操作与可见性管理遵循现有全景图/视频点位模式，保持 API 统一性。
- 点位聚合接口需要将图片集点位合并进入 `points`，新增 `type: 'image-set'` 以便前端区分。

### 4) 前端展示与交互
- 上传入口：在已有上传弹窗体系中新增图片集上传对话框，支持拖拽多图与顺序调整。
- 地图展示：新增图片集 marker 类型与样式配置；点位列表中可显示图片数量与封面缩略图。
- 详情展示：新增图片集查看器（网格 + 轮播 + 全屏），与视频/全景图查看器并列。
- 统一点位列表与过滤：列表和搜索支持按类型筛选（全景图/视频/图片集）。

## 四、扩展开发 TodoList（原则导向）

### A. 数据模型与存储
- 明确图片集点位的数据实体与字段范围（主表 + 子表），确保与现有点位字段命名一致。
- 约定 `type` 枚举值并在统一点位输出中稳定化。
- 设计级联删除与事务策略，确保“数据库记录 + 物理文件”一致性。

### B. 后端接口与服务
- 新增图片集 CRUD 与批量操作接口，保持与全景图/视频点位接口风格一致。
- 新增图片集上传与多文件处理流程，覆盖：类型校验、大小限制、缩略图生成、封面选择。
- 在统一点位接口中合并图片集数据，并补齐与现有字段一致的返回结构（`lat`/`lng`、`thumbnailUrl`、`url`）。
- 增加必要的权限校验与可见性过滤规则，与文件夹可见性逻辑保持一致。

### C. 前端交互与体验
- 新增图片集上传对话框与预览区域，支持多图选择、排序、删除、封面标记。
- 将图片集纳入点位列表与地图 markers，新增样式配置入口。
- 新增图片集查看器，并与现有视频/全景图查看器并列管理（弹窗或页面）。

### D. 统一点位与地图展示
- 在地图 marker 生成逻辑中加入图片集 `type` 的处理，并保证样式独立可配置。
- 统一点位列表与筛选条件增加图片集类型，确保搜索与统计正确。

### E. 配置与数据一致性
- 检查 SQLite 初始化 schema 与 Prisma schema 的字段一致性，避免新字段仅出现在某一侧。
- 确保上传目录结构中新增图片集目录，并纳入静态资源暴露范围。

### F. 质量与运维原则
- 为图片集上传与删除增加异常回滚与文件清理策略。
- 增加最小化的接口与 UI 级验证规则（类型、大小、数量、坐标合法性）。
- 复用现有点位样式与坐标转换工具，避免创建“孤立逻辑分支”。
