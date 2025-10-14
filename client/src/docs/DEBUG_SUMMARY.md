# 等高线调试日志摘要

## 已添加的调试功能

### 1. 详细的控制台日志

所有关键函数都添加了 `eslint-disable-next-line no-console` 注释的调试日志：

#### 主流程 (`use-contour-overlay.js`)

- **generateContoursForRegion**
  - 绘制区域信息（边界、坐标点数、首尾点）
  - 服务返回的特征数和瓦片
  - 高程统计（范围、唯一值数量）
  - 渲染结果

- **renderLayer**
  - 输入特征数量
  - 裁剪前后对比
  - GeoJSON 图层创建和添加过程

- **clipFeatureToPolygon**
  - 多边形边界和点数
  - 特征样本坐标
  - 坐标是否在边界内的检查
  - 每个高程值的裁剪统计

- **clipLineByPolygon**
  - 点的分类统计（边界外/多边形内/多边形外）
  - 输出线段数

#### 等高线生成 (`contour-generator.js`)

- 数据范围分析
- 阈值计算（数量、实际间距、范围）
- d3-contour 生成的轮廓数
- GeoJSON 特征转换结果
- 第一个特征的坐标示例

### 2. 调试工具 (`contour-debug.js`)

提供了可复用的调试函数：

- **debugCoordinateTransform()** - 测试坐标转换
- **debugFeatureBounds(features)** - 计算特征边界
- **debugOverlap(polygonBounds, featureBounds)** - 检查重叠
- **debugContourRendering(region, features)** - 完整诊断

### 3. 单元测试框架

创建了 `use-contour-overlay.test.js` 测试文件，包括：

- 初始化测试
- 等高线生成测试
- 空结果处理测试
- 开关切换测试

## 如何使用

### 步骤 1：启动开发服务器

```bash
cd client
npm run dev
```

### 步骤 2：打开浏览器控制台

1. 打开应用（通常是 http://localhost:5173）
2. 按 F12 打开开发者工具
3. 切换到 Console 标签

### 步骤 3：绘制区域并观察日志

1. 点击"显示等高线"按钮
2. 在地图上绘制一个多边形区域
3. 完成绘制（双击或点击起点）
4. 查看控制台输出

## 预期的日志输出

```text
[Contour Debug] 开始生成等高线
[Contour Debug] 绘制区域边界: LatLngBounds {_southWest: LatLng, _northEast: LatLng}
[Contour Debug] 绘制区域坐标点数: 5
[Contour Debug] 第一个点: LatLng {lat: 30.xxx, lng: 120.xxx}
[Contour Debug] 最后一个点: LatLng {lat: 30.xxx, lng: 120.xxx}

[contour-generator] 数据范围: {min: 0, max: 3500}
[contour-generator] 阈值数量: 50 实际间距: 700
[contour-generator] 阈值范围: 0 - 34300
[contour-generator] d3-contour 生成的轮廓数: 49
[contour-generator] 转换后的特征数: 49
[contour-generator] 第一个特征坐标示例: [120.xxx, 30.xxx]

[Contour Debug] 服务返回的原始特征数: 49
[Contour Debug] 涉及的瓦片: ["srtm_61_07"]
[Contour Debug] 第一个特征: {elevation: 700, spacing: 700, geometryType: "MultiLineString", ...}
[Contour Debug] 第一条线的起点: [120.xxx, 30.xxx]
[Contour Debug] 第一条线的终点: [120.xxx, 30.xxx]
[Contour Debug] 唯一高程值数量: 49
[Contour Debug] 高程范围: 700 - 34300

=== 等高线渲染调试 ===
1. 绘制区域信息:
   - 点数: 5
   - 边界: {getSouth: ƒ, getNorth: ƒ, ...}
2. 等高线特征信息:
   - 特征数: 49
[debug] 特征边界: {minLng: 120.xxx, maxLng: 121.xxx, minLat: 30.xxx, maxLat: 31.xxx}
3. 重叠检查:
[debug] 多边形边界: {...}
[debug] 特征边界: {...}
[debug] 是否重叠: {overlaps: true/false, ...}

[renderLayer] 输入特征数量: 49
[renderLayer] 是否需要裁剪: true
[renderLayer] 裁剪多边形点数: 4
[renderLayer] 裁剪多边形样本: [{lat: 30.xxx, lng: 120.xxx}, ...]

[clipFeature] 裁剪边界: {minLat: 30.xxx, maxLat: 31.xxx, ...}
[clipFeature] 多边形点数: 4
[clipFeature] 多边形前3个点: [{lat: ..., lng: ...}, ...]
[clipFeature] 特征样本坐标: [120.xxx, 30.xxx]
[clipFeature] 坐标是否在边界内: {lngInBounds: true/false, latInBounds: true/false}

[clipLine] 点统计 - 总点数: 100 边界外: 10 多边形内: 50 多边形外: 40 输出线段数: 5
[clipFeature] 高程 700 总线段: 10 保留线段: 5 输出坐标数组数: 5

[renderLayer] 裁剪前特征数: 49 裁剪后特征数: 0-49
[renderLayer] 创建 GeoJSON 图层，特征数: X
[renderLayer] 图层创建成功，准备添加到地图
[renderLayer] 图层已添加到地图
[Contour Debug] 渲染结果 visible: true/false
```

## 关键诊断指标

### 1. 裁剪后特征数为 0

**日志特征**：
```
[renderLayer] 裁剪前特征数: 49 裁剪后特征数: 0
[renderLayer] 没有特征需要渲染
```

**可能原因**：
- 绘制区域和数据范围不重叠
- 坐标系不匹配
- 裁剪算法过于严格

### 2. 多边形内点数为 0

**日志特征**：
```
[clipLine] 点统计 - ... 多边形内: 0 ...
```

**可能原因**：
- `pointInPolygon` 算法问题
- 多边形未正确闭合
- 坐标精度问题

### 3. 坐标不在边界内

**日志特征**：
```
[clipFeature] 坐标是否在边界内: {lngInBounds: false, latInBounds: false}
```

**可能原因**：
- 坐标转换错误（WGS84 vs GCJ-02）
- 特征坐标和绘制区域坐标系不同
- 数据文件坐标范围错误

## 下一步调试

根据控制台输出，可以：

1. **验证坐标系** - 比较特征坐标和多边形坐标的数值范围
2. **检查重叠** - 查看 `debugOverlap` 的输出
3. **测试裁剪** - 临时禁用裁剪，看特征是否能显示
4. **验证数据** - 使用 QGIS 打开 GeoTIFF 文件确认数据正确性

## 临时修复方案

如果需要快速验证功能，可以在 `renderLayer` 函数中临时跳过裁剪：

```javascript
// 临时禁用裁剪进行测试
if (clipPolygon && false) {  // 添加 && false
  features = features
    .map((feature) => clipFeatureToPolygon(feature, clipPolygon))
    .filter(Boolean);
}
```

这样可以确认问题是否出在裁剪逻辑上。
