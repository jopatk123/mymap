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

## 四、已完成工作（本阶段总结）

- 后端 routes：完成 kebab-case 与部分复数化，并已在 `server/src/routes/index.js` 落地；旧路由文件删除。
- 后端 controllers：完成 kebab-case 重命名（包含 `panorama/*`、`video-point/*`、`kml-*`、`point-style` 等），采用“先别名再真实迁移”的两步法，现均为真实文件，旧 camelCase 文件已删除。
- 后端 models：完成 `kml-file.model.js`、`kml-point.model.js`、`video-point.model.js` 的真实重命名与引用修正。
- 后端 services：完成 `kml-parser.service.js`、`video-point.service.js`、`panorama/panorama-query.service.js`、`panorama/panorama-mutation.service.js` 的真实重命名与引用修正，并在本次修复中补充了坐标字段映射（`lat/lng` → `latitude/longitude`）。
- 前端样式：`assets/styles` → `styles`，调整 `vite.config.js` 注入路径与 `main.js` 全局样式导入；旧目录已删除。
- 前端 API：曾创建 kebab-case 转发别名，后保守回滚为原始 `camelCase` 文件（`kml.js`、`panorama.js`、`pointStyle.js`、`video.js`、`folder.js`），并清理别名文件，确保构建/运行稳定。
- 前端 Services：`map-service.js`、`panorama-viewer-service.js` 已完成真实重命名与旧名删除（`mapService.js`、`panoramaViewerService.js`）。
- 前端视图与组件：去重 `views/Map/components/MapSidebar.vue`，统一引用 `components/map/MapSidebar.vue`；`MapSidebar` 简化为复用 `PanoramaList` 的事件分发。
- Bug 修复：
  - 服务器崩溃（MODULE_NOT_FOUND/路由名不匹配）已通过统一路由与控制器真实重命名修复。
  - 视频点被当作全景图打开：在 `useMapInteractions.js` 增加类型判断（`point.type === 'video' || point.videoUrl || point.video_url`）。
  - 前端 500/动态导入失败：恢复原始 API 文件并改回引用路径。
  - 全景上传超时：`client/src/api/panorama.js` 上传超时提升至 300s。
  - 全景上传 500（数据库 NOT NULL）：服务层补齐 `lat/lng` → 模型 `latitude/longitude` 的映射；控制器 catch 内补 `Logger`，避免未定义导致未处理拒绝。

方法论（本轮实施方式）：
- 两步法（别名/转发 → 全量迁移 → 删除旧名），每步后构建/运行校验。
- 小步提交，可回滚；高风险项先加转发，待验证稳定后再“真实重命名 + 删除旧名”。
- 前后端分别验证：
  - 后端：通过 `node -e "require(...)"` 逐文件加载、`nodemon` 启动、接口实际调用。
  - 前端：`vite` 启动、本地交互测试，重点验证路由接口、上传、地图点位点击流程。

## 五、未完成与暂缓项

- 后端 `utils/` 命名统一（建议）：如 `kmlFileUtils.js` → `kml-file-utils.js`，`sqlite-adapter.js`/`QueryBuilder.js` 保持已有风格但统一导出命名与引用；当前被用户指示“暂缓”。
- 若存在个别历史 shim 文件或无引用文件，需要二次巡检并删除（低风险收尾）。
- 文档与注释中对旧文件名的残留引用（若有），后续扫清。

## 六、下一步计划（新窗口接力）

优先序：
1) 后端 `utils/` 命名统一（采用同样的两步法）：
   - 建立 kebab-case 新文件转发至旧文件；
   - 批量更新引用；
   - 验证后“真实迁移 + 删除旧名”。
   - 重点文件：`utils/kmlFileUtils.js`、`utils/coordinate-transform.js` 与 `server/src/utils/*` 命名一致性检查。
2) 二次巡检无用别名/死代码并删除；保证所有 require/import 指向真实文件。
3) 补充一次端到端验证：
   - 地图加载/KML 渲染/点位筛选；
   - 全景上传、查看、移动、隐藏/显示；
   - 视频点上传与查看。
4) 提交并标记阶段性完成。

注意事项：
- 保持“保守但持续推进”，任何高风险重命名先上别名再迁移。
- 每一批改动后，都进行后端启动与关键上传/查看用例验证。
- 若出现 500/崩溃，先回滚最近批次或启用 shim，快速恢复再定位。
