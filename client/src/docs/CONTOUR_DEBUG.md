# 等高线不显示问题调试指南

## 问题描述

用户报告：无论如何绘制区域，都显示"成功生成 49 条等高线，间距约 700 米"，但实际没有显示出来。

## 调试日志说明

已经在以下文件中添加了详细的调试日志：

### 1. `use-contour-overlay.js`

调试标签：
- `[Contour Debug]` - 主流程调试
- `[renderLayer]` - 渲染图层调试  
- `[clipFeature]` - 特征裁剪调试
- `[clipLine]` - 线段裁剪调试

关键检查点：
- 绘制区域的边界和坐标点
- 服务返回的原始特征数
- 高程值范围和间距
- 裁剪前后的特征数量
- 最终渲染结果

### 2. `contour-generator.js`

调试标签：
- `[contour-generator]`

关键信息：
- 数据范围（最小值和最大值）
- 生成的阈值数量和实际间距
- d3-contour 生成的轮廓数
- 转换后的 GeoJSON 特征数
- 第一个特征的坐标示例

### 3. `contour-debug.js` 工具

提供的调试函数：
- `debugCoordinateTransform()` - 检查 WGS84 到 GCJ-02 的坐标转换
- `debugFeatureBounds(features)` - 计算特征的边界范围
- `debugOverlap(polygonBounds, featureBounds)` - 检查多边形和特征是否重叠
- `debugContourRendering(region, features)` - 完整的渲染调试信息

## 可能的问题原因

### 1. 坐标系不匹配

**症状**：特征生成了但裁剪后全部丢失

**检查方法**：
```javascript
// 在控制台查看
[clipFeature] 裁剪边界: { minLat, maxLat, minLng, maxLng }
[clipFeature] 特征样本坐标: [lng, lat]
[clipFeature] 坐标是否在边界内: { lngInBounds, latInBounds }
```

**原因分析**：
- 用户绘制的多边形：在高德地图上绘制，使用 GCJ-02 坐标系
- 等高线特征：从 WGS84 GeoTIFF 生成，然后在 `pixelToWorld()` 中转换为 GCJ-02
- 理论上坐标系应该一致

**可能问题**：
- 转换精度问题
- 边界框计算问题
- Leaflet LatLngBounds 使用问题

### 2. 裁剪逻辑过于严格

**症状**：`[clipLine]` 显示大量点被判定为"多边形外"

**检查方法**：
```javascript
[clipLine] 点统计 - 总点数: X 边界外: Y 多边形内: Z 多边形外: W 输出线段数: N
```

**原因分析**：
- `pointInPolygon` 射线法可能有边界情况
- 坐标精度问题导致边界点判断错误
- 多边形闭合问题

### 3. 数据范围问题

**症状**：间距 700 米太大，说明数据范围很大

**检查方法**：
```javascript
[contour-generator] 数据范围: { min, max }
[contour-generator] 阈值范围: X - Y
```

**原因分析**：
- GeoTIFF 数据可能包含无效值（如海洋区域的极大/极小值）
- `noDataValue` 过滤可能不完整
- 需要检查是否有异常值

### 4. GeoJSON 渲染问题

**症状**：特征存在但不在地图上显示

**检查方法**：
```javascript
[renderLayer] 创建 GeoJSON 图层，特征数: X
[renderLayer] 图层已添加到地图
```

**原因分析**：
- Leaflet 图层顺序问题（pane 设置）
- 样式问题（颜色、粗细、透明度）
- 坐标范围超出当前视图

## 调试步骤

### 第一步：验证特征生成

1. 打开浏览器控制台
2. 点击"显示等高线"按钮
3. 绘制一个区域
4. 查看日志：

```
[Contour Debug] 服务返回的原始特征数: X
[contour-generator] 转换后的特征数: Y
```

如果 X = 0，说明没有数据或数据加载失败。
如果 X > 0 但 Y = 0，说明转换过程有问题。

### 第二步：检查坐标边界

查看日志：
```
[Contour Debug] 绘制区域边界: { ... }
[Contour Debug] 特征实际边界: { ... }
```

手动比较两个边界是否有重叠。如果完全不重叠，说明坐标系或数据范围有问题。

### 第三步：检查裁剪过程

查看日志：
```
[renderLayer] 裁剪前特征数: X 裁剪后特征数: Y
[clipFeature] 总线段: A 保留线段: B
[clipLine] 多边形内: Z
```

如果 Z = 0（没有点在多边形内），说明裁剪逻辑或坐标系有问题。

### 第四步：检查渲染

```
[renderLayer] 图层已添加到地图
```

如果看到这条日志，打开浏览器开发者工具：
1. Elements 标签
2. 搜索 `contourPane` 或 `.leaflet-overlay-pane`
3. 检查是否有 SVG 路径元素

## 临时解决方案

### 方案 1：禁用裁剪测试

临时修改 `renderLayer` 函数，不进行裁剪：

```javascript
if (clipPolygon) {
  // 暂时跳过裁剪
  console.warn('[DEBUG] 跳过裁剪以测试');
  // features = features.map(...).filter(Boolean);
}
```

这样可以验证是否是裁剪逻辑的问题。

### 方案 2：使用更大的绘制区域

尝试绘制一个覆盖整个瓦片的大区域（例如 5° × 5°），看是否能显示等高线。

### 方案 3：检查数据文件

使用 QGIS 等工具打开 GeoTIFF 文件，确认：
- 数据是否存在
- 坐标范围是否正确
- NoData 值设置是否正确

## 下一步

根据控制台输出的调试信息：

1. **如果特征边界和绘制边界完全不重叠**
   - 检查坐标转换逻辑
   - 验证 GeoTIFF 的坐标系统

2. **如果边界重叠但裁剪后无特征**
   - 检查 `pointInPolygon` 算法
   - 验证多边形闭合
   - 检查坐标精度

3. **如果有裁剪后的特征但不显示**
   - 检查 Leaflet 图层配置
   - 验证 pane 设置
   - 检查 CSS 样式

4. **如果数据范围异常**
   - 改进 `noDataValue` 过滤
   - 添加数据范围限制
   - 使用统计方法去除异常值

## 测试命令

```bash
# 运行等高线相关测试
cd client
npm test use-contour-overlay

# 运行坐标转换测试
npm test coordinate-transform
```
