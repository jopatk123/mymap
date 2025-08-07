# 点位图标形状设置删除总结

## 修改概述
根据需求，删除了点位图标设置中的标记形状属性设置，固定使用默认的水滴形状（marker），保留颜色、大小和透明度设置。

## 修改的文件

### 前端文件

#### 1. 组件文件
- `client/src/components/map/styles/PointStyleEditor.vue`
  - 删除了标记形状选择下拉框
  - 移除了 `iconType` 相关的状态和属性
  - 简化了预览样式，固定使用 marker 形状

- `client/src/components/map/KmlStyleDialog.vue`
  - 移除了 `iconType` 字段的处理
  - 保存时固定使用 'marker' 形状

- `client/src/components/map/PointStyleDialog.vue`
  - 移除了 API 格式转换中的 `iconType` 字段
  - 保存时固定使用 'marker' 形状

#### 2. 工具函数和服务
- `client/src/utils/map-utils.js`
  - 简化了 `getIconShapeHtml` 函数，移除形状参数，固定返回 marker SVG
  - 更新了 `createPanoramaMarker` 和 `createVideoMarker` 函数
  - 移除了形状判断逻辑，统一使用 marker 尺寸和锚点

- `client/src/composables/useKmlLayer.js`
  - 简化了图标形状 HTML 生成函数
  - 移除了多种形状的支持，固定使用 marker
  - 统一了标签位置计算和图标尺寸

- `client/src/services/StyleRenderer.js`
  - 移除了 `iconType` 字段的处理
  - 简化了点样式渲染逻辑

#### 3. 常量和配置
- `client/src/constants/map.js`
  - 移除了默认样式中的 `point_icon_type` 字段

- `client/src/composables/useKmlStyles.js`
  - 移除了样式配置中的 `point_icon_type` 字段

- `client/src/composables/usePointStyles.js`
  - 移除了点样式配置中的 `point_icon_type` 字段

### 后端文件

#### 1. 服务文件
- `server/src/services/ConfigService.js`
  - 移除了默认配置中的 `point_icon_type` 字段

#### 2. 配置文件
- `server/config/app-config.json`
  - 移除了所有样式配置中的 `point_icon_type` 字段

### 数据库修改

#### 1. 表结构修改
执行了以下 SQL 命令删除相关字段：
```sql
ALTER TABLE kml_file_styles DROP COLUMN point_icon_type;
ALTER TABLE panorama_point_styles DROP COLUMN point_icon_type;
ALTER TABLE video_point_styles DROP COLUMN point_icon_type;
```

#### 2. 创建的脚本文件
- `scripts/remove-icon-type-fields.sql` - 数据库字段删除脚本

#### 3. 删除的脚本文件
- `scripts/update-default-marker-type.sql` - 已删除，不再需要

## 功能变更

### 保留的功能
- ✅ 标记颜色设置
- ✅ 标记大小设置
- ✅ 标记透明度设置
- ✅ 标签字体大小设置
- ✅ 标签颜色设置

### 删除的功能
- ❌ 标记形状选择（圆形、方形、三角形、菱形、地图标记）
- ❌ 相关的形状配置存储和处理

### 固定的行为
- 🔒 所有点位标记固定使用水滴形状（marker）
- 🔒 统一的图标尺寸计算（宽度: size * 2, 高度: size * 3.2）
- 🔒 统一的锚点位置（底部中心）

## 影响范围

### 用户界面
- 点位样式编辑器中不再显示形状选择选项
- 预览效果固定显示水滴形状
- 所有现有的点位将统一显示为水滴形状

### 数据存储
- 数据库中不再存储形状信息
- 配置文件中移除了形状相关配置
- API 响应中不再包含形状字段

### 兼容性
- 前端代码已适配，不再依赖形状字段
- 后端 API 保持兼容，忽略形状相关请求
- 现有数据不受影响，只是不再使用形状信息

## 测试建议

1. **功能测试**
   - 验证点位样式编辑器界面正常
   - 确认颜色、大小、透明度设置正常工作
   - 检查预览效果显示正确

2. **数据测试**
   - 验证样式保存和加载功能
   - 确认现有点位显示正常
   - 检查不同类型点位（全景图、视频、KML）的显示

3. **兼容性测试**
   - 测试现有项目的升级兼容性
   - 验证 API 接口的向后兼容性

## 部署注意事项

1. **数据库升级**
   - 执行 `scripts/remove-icon-type-fields.sql` 脚本
   - 建议在执行前备份数据库

2. **前后端同步部署**
   - 建议同时部署前端和后端代码
   - 避免版本不匹配导致的问题

3. **缓存清理**
   - 清理浏览器缓存
   - 重启应用服务确保配置生效