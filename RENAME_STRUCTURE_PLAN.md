# 结构与命名调整计划（不做大重构）

目的：在不改变业务逻辑与架构的前提下，仅做“文件/目录重命名与位置调整 + 必要的导入路径/小范围代码调整”，提升一致性与可维护性。

---

## 一、范围与基本原则
- 仅涉及文件与目录的重命名、位置调整、导入路径修正、少量导出命名统一；不修改接口契约、不变更核心逻辑。
- 统一命名风格：
  - 目录与文件：kebab-case（短横线），如：`kml-file.controller.js`。
  - Vue 组件文件：PascalCase（保留 `.vue` 文件名风格），目录仍用 kebab-case。
  - 资源路由文件：建议复数（如 `video-points.routes.js`），特殊项除外（`config.routes.js` 可保留）。
- 前端职责划分：
  - `views/地图页面容器` 与 `components/可复用组件` 分离；去重同名组件。
  - `api/` 命名与后端资源名保持一致。
- 样式组织：收敛全局样式到 `src/styles/`，组件私有样式留在 SFC；保留样式编辑器子目录。

---

## 二、具体调整清单（旧 → 新）

说明：以下清单按“优先级高 → 低”排序。

### 1) 后端（server）

目录：`server/src/`

- 控制器 controllers
  - `controllers/kmlFile.controller.js` → `controllers/kml-file.controller.js`
  - `controllers/kmlFileBase.controller.js` → `controllers/kml-file-base.controller.js`
  - `controllers/kmlFileBatchController.js` → `controllers/kml-file-batch.controller.js`
  - `controllers/kmlFileStyleController.js` → `controllers/kml-file-style.controller.js`
  - `controllers/kmlPointQueryController.js` → `controllers/kml-point-query.controller.js`
  - `controllers/pointStyle.controller.js` → `controllers/point-style.controller.js`
  - `controllers/videoPoint.controller.js` → `controllers/video-point.controller.js`
  - `controllers/videoPoint/videoPointMutation.controller.js` → `controllers/video-point/video-point-mutation.controller.js`
  - `controllers/videoPoint/videoPointQuery.controller.js` → `controllers/video-point/video-point-query.controller.js`
  - `controllers/panorama/panoramaMutation.controller.js` → `controllers/panorama/panorama-mutation.controller.js`
  - `controllers/panorama/panoramaQuery.controller.js` → `controllers/panorama/panorama-query.controller.js`
  - `controllers/panorama/panoramaUtils.controller.js` → `controllers/panorama/panorama-utils.controller.js`

- 路由 routes
  - `routes/kmlFile.routes.js` → `routes/kml-file.routes.js`
  - `routes/pointStyle.routes.js` → `routes/point-styles.routes.js`（统一复数）
  - `routes/videoPoint.routes.js` → `routes/video-points.routes.js`
  - `routes/panorama.routes.js` → `routes/panoramas.routes.js`
  - `routes/folder.routes.js` → `routes/folders.routes.js`（可选）

- 模型 models
  - `models/kmlFile.model.js` → `models/kml-file.model.js`
  - `models/kmlPoint.model.js` → `models/kml-point.model.js`
  - `models/videoPoint.model.js` → `models/video-point.model.js`

- 其他
  - 若存在意外的 `server/src/src/` 重复目录，清理或上移到 `server/src/`（逐文件确认）。

受影响的代码点：
- `server/src/routes/index.js` 中的 `require/import` 路径。
- 各路由文件中引用的控制器路径。
- 各服务/控制器中引用的模型路径。

### 2) 前端（client）

目录：`client/src/`

- API 命名统一（与后端资源对齐）
  - `api/kml.js` → `api/kml-files.js`
  - `api/panorama.js` → `api/panoramas.js`
  - `api/pointStyle.js` → `api/point-styles.js`
  - `api/video.js` → `api/video-points.js`
  - `api/folder.js` → `api/folders.js`
  - `api/points.js` 保持（已复数）

- Services 统一 kebab-case 文件名（不改变类名）
  - `services/mapService.js` → `services/map-service.js`
  - `services/panoramaViewerService.js` → `services/panorama-viewer-service.js`

- Views 与 Components 去重与归口
  - 保留可复用组件在 `components/map/`：`MapContainer.vue`、`MapControls.vue`、`MapSidebar.vue`、`MapStatusBar.vue`、`MapToolbar.vue` 等。
  - 页面专属组件保留在 `views/Map/components/`：`MapDialogs.vue`、`MapView.vue`。
  - 删除重复：`views/Map/components/MapSidebar.vue`（用 `components/map/MapSidebar.vue` 替代），并修正 `views/Map/index.vue`、`views/Map/components/MapView.vue` 的导入路径。

- Stores 目录名统一
  - `store/` → `stores/`（Pinia 社区惯例）；内部文件名不变，导出函数统一 `useXStore` 命名（已满足）。

- 样式收敛
  - 将 `assets/styles/` 合并为 `styles/`：`assets/styles/global.scss`、`assets/styles/variables.scss` → `styles/` 下同名文件。
  - 更新 `vite.config.js` 中的 `additionalData` 路径到 `@/styles/variables.scss`。

受影响的代码点：
- 所有 `@/api/*` 的导入路径与索引聚合（`api/index.js`）。
- `views/Map/*` 与 `components/map/*` 对 `MapSidebar` 的引用处。
- `main.js`、各组件/组合式函数中引用 `stores/*` 的路径。
- Vite SCSS 变量注入路径。

---

## 三、代码层面的简单调整
- 保持导出命名不变；若导出名与文件名强绑定（极少数情况），仅适配导入语句，不改业务代码。
- Vue 组件引用统一使用绝对别名 `@/`；批量替换相对路径以减少后续改动受影响面。
- 保持 API 方法名、接口入参、响应结构不变；仅更新 API 文件名与导入路径。

---


