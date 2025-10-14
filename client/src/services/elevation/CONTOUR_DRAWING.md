# 等高线区域绘制功能说明

## 功能概述

新的等高线功能允许用户自定义绘制区域，然后在该区域内生成和显示等高线。

## 使用步骤

### 1. 启动绘制模式

点击地图顶部的"显示等高线"按钮，系统会：
- 鼠标光标变为十字准星（crosshair）
- 显示提示信息："请在地图上点击绘制区域，双击或点击起点完成绘制"

### 2. 绘制区域

在地图上点击以添加多边形的顶点：
- **单击**：添加一个顶点
- **双击**：完成绘制
- **点击起点附近**：自动完成绘制（距离起点20米内）
- 至少需要 **3个点** 才能形成有效区域

### 3. 等高线生成

绘制完成后，系统会自动：
1. 在绘制区域内生成等高线
2. 显示成功消息（例如："成功生成 156 条等高线"）
3. 在地图上渲染等高线

### 4. 查看等高线

等高线以橙色线条显示：
- **颜色**：#ff6d00（橙色）
- **线宽**：1.5px
- **不透明度**：80%
- **间距**：20米

### 5. 隐藏等高线

再次点击"显示等高线"按钮：
- 隐藏等高线图层
- 清除绘制的区域多边形
- 清除缓存数据

## 配置参数

### 等高线生成参数

```javascript
{
  thresholdStep: 20,    // 等高线间距（米）
  sampleSize: 512,      // 采样分辨率（像素）
  maxContours: 50       // 最大等高线数量
}
```

### 绘制样式

**绘制过程中的线条**：
```javascript
{
  color: '#ff6d00',
  weight: 2,
  opacity: 0.8,
  dashArray: '5,5',    // 虚线
  fill: false
}
```

**完成后的多边形**：
```javascript
{
  color: '#ff6d00',
  weight: 2,
  opacity: 0.8,
  fillColor: '#ff6d00',
  fillOpacity: 0.1     // 半透明填充
}
```

**顶点标记**：
- 8px 圆点
- 橙色背景
- 白色边框
- 阴影效果

## 工作原理

### 1. 区域裁剪

系统使用边界框裁剪算法：
1. 获取绘制多边形的边界框（南北西东坐标）
2. 遍历所有等高线的线段
3. 只保留在边界框内的坐标点
4. 过滤掉少于2个点的线段

### 2. 等高线生成

1. 根据绘制区域的边界查找相关的 GeoTIFF 瓦片
2. 从瓦片中读取高程数据
3. 使用 d3-contour 的 Marching Squares 算法生成等高线
4. 将像素坐标转换为地理坐标（WGS-84）
5. 转换为高德地图坐标系（GCJ-02）
6. 裁剪到绘制区域内
7. 渲染到地图上

### 3. 性能优化

- **瓦片缓存**：已加载的 GeoTIFF 瓦片会被缓存
- **等高线缓存**：生成的等高线特征会被缓存
- **按需加载**：只加载绘制区域相关的瓦片
- **采样控制**：通过 sampleSize 参数控制精度和性能平衡

## 错误处理

### 点数不足

如果绘制少于3个点就尝试完成：
- 显示警告："至少需要3个点才能形成区域"
- 不会生成等高线

### 无数据区域

如果绘制区域内没有高程数据：
- 显示警告："所选区域内没有高程数据"
- 清除绘制的多边形
- 清除绘制状态

### 生成失败

如果等高线生成过程出错：
- 显示错误："等高线生成失败，请稍后重试"
- 清除绘制的多边形
- 记录错误到控制台

## API 使用

### 在组件中使用

```javascript
import { useContourOverlay } from '@/composables/use-contour-overlay';
import { ElMessage } from 'element-plus';

const { 
  contoursVisible,
  contoursLoading,
  isDrawing,
  toggleContours,
  disposeContours 
} = useContourOverlay(mapRef, {
  message: ElMessage,
});

// 切换等高线显示
toggleContours();

// 检查状态
console.log(contoursVisible.value);  // 是否可见
console.log(contoursLoading.value);  // 是否加载中
console.log(isDrawing.value);        // 是否在绘制模式

// 清理
disposeContours();
```

### usePolygonDrawer API

```javascript
import { usePolygonDrawer } from '@/composables/use-polygon-drawer';

const polygonDrawer = usePolygonDrawer(mapRef, {
  message: ElMessage,
  onComplete: (result) => {
    console.log('多边形绘制完成:', result);
    // result.polygon - Leaflet 多边形对象
    // result.bounds - 边界框
    // result.latLngs - 坐标数组
  }
});

// 开始绘制
polygonDrawer.startDrawing();

// 停止绘制
polygonDrawer.stopDrawing();

// 清除绘制
polygonDrawer.clear();

// 完全重置
polygonDrawer.reset();

// 检查状态
console.log(polygonDrawer.isDrawing.value);
console.log(polygonDrawer.polygon.value);
```

## 调试

### 浏览器控制台日志

启用以下日志前缀来跟踪执行流程：

- `[ContourOverlay]` - 等高线覆盖层操作
- `[ElevationService]` - 高程服务操作
- `[TileLoader]` - GeoTIFF 瓦片加载

示例日志：
```
[ContourOverlay] Polygon drawn: {south: 26.0, north: 26.2, ...}
[ElevationService] Getting contours for bounds: {...}
[ElevationService] Generated contours from 1 tiles, 156 features
[ContourOverlay] Generated 156 features
[ContourOverlay] Rendered 142 contour features
```

### 常见问题排查

**Q: 绘制完成后没有等高线显示**
- 检查控制台是否有错误
- 确认绘制区域在数据覆盖范围内（lat 20-35°N, lng 115-125°E）
- 查看是否有 "No features after clipping" 日志

**Q: 等高线太密集或太稀疏**
- 修改 `thresholdStep` 参数（当前默认 20米）
- 增大值：等高线更稀疏
- 减小值：等高线更密集

**Q: 性能问题**
- 减小 `sampleSize`（当前默认 512）
- 减小绘制区域的大小
- 限制 `maxContours` 数量

**Q: 绘制时鼠标光标没有变化**
- 检查是否正确调用了 `startDrawing()`
- 查看浏览器控制台是否有 JavaScript 错误
- 确认地图实例已经初始化

## 未来改进方向

1. **更精确的裁剪**
   - 使用 turf.js 进行真正的多边形裁剪
   - 支持复杂的多边形形状

2. **交互增强**
   - 支持编辑已绘制的区域
   - 支持保存和加载绘制区域
   - 添加撤销/重做功能

3. **样式定制**
   - 允许用户自定义等高线颜色
   - 支持标注高程值
   - 添加图例显示

4. **导出功能**
   - 导出等高线为 GeoJSON
   - 导出为图像
   - 导出为 DXF/Shapefile

5. **性能优化**
   - 使用 Web Worker 进行等高线计算
   - 实现渐进式渲染
   - 添加 LOD（细节层次）支持
