# 高程服务文档

## 功能概述

高程服务提供以下功能：
1. **实时高程查询**：鼠标移动时显示当前位置的经纬度和海拔高程
2. **等高线显示**：在地图上叠加显示等高线图层

## 数据来源

- 使用 SRTM（Shuttle Radar Topography Mission）地形数据
- 数据格式：GeoTIFF
- 数据位置：`/geo` 目录
- 覆盖范围：纬度 20-35°N，经度 115-125°E

## 缓存策略

### 浏览器缓存（HTTP 缓存）
GeoTIFF 文件通过以下 HTTP 缓存头实现长期缓存：

```http
Cache-Control: public, max-age=31536000, immutable
Accept-Ranges: bytes
```

- `max-age=31536000`：缓存 1 年（365天）
- `immutable`：告诉浏览器文件永远不会改变
- `Accept-Ranges: bytes`：支持 HTTP Range 请求，提高加载效率

**优势：**
- 首次加载后，浏览器会将 GeoTIFF 文件缓存到本地磁盘
- 后续访问直接从浏览器缓存读取，无需重新下载
- 大幅减少网络流量和加载时间

### 内存缓存（应用层缓存）
客户端 JavaScript 代码还实现了两层内存缓存：

#### 1. 瓦片缓存（Tile Cache）
- 位置：`tile-loader.js`
- 缓存内容：已加载的 GeoTIFF 瓦片的元数据和图像对象
- 生命周期：页面会话期间
- 作用：避免重复解析同一个 GeoTIFF 文件

#### 2. 等高线缓存（Contour Cache）
- 位置：`elevation-service.js`
- 缓存内容：已生成的等高线 GeoJSON 特征
- 生命周期：页面会话期间
- 作用：避免重复计算等高线（计算密集型操作）

### 清除缓存

如果需要清除内存缓存（例如数据更新后），可以调用：

```javascript
import { elevationService } from '@/services/elevation';

// 清除所有缓存
elevationService.clearCaches();
```

如果需要清除浏览器 HTTP 缓存，用户需要：
1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

## 性能优化

### 1. 按需加载
- GeoTIFF 文件只在需要时才加载（懒加载）
- 利用 HTTP Range 请求只读取需要的数据部分

### 2. 节流处理
- 鼠标移动事件被节流到 200ms，避免频繁查询
- 地图移动事件也有节流处理

### 3. 视口感知
- 等高线只为当前可见区域生成
- 地图移动时自动更新等高线

### 4. 双向坐标转换
- 存储数据使用 WGS-84 坐标系
- 显示数据转换为 GCJ-02（高德地图坐标系）
- 自动处理坐标转换，确保位置准确

## 技术栈

- **geotiff.js**：客户端 GeoTIFF 文件解析
- **d3-contour**：等高线生成算法（Marching Squares）
- **Leaflet**：地图渲染和图层管理
- **Vue 3**：响应式状态管理

## 使用示例

### 查询单点高程

```javascript
import { elevationService } from '@/services/elevation';

const result = await elevationService.getElevation(26.12, 119.39);
console.log(result);
// {
//   hasData: true,
//   elevation: 245,  // 单位：米
//   tileId: 'srtm_60_07',
//   lat: '26.120000',
//   lng: '119.390000'
// }
```

### 生成等高线

```javascript
import { elevationService } from '@/services/elevation';

const bounds = {
  minLat: 26.0,
  maxLat: 26.2,
  minLng: 119.3,
  maxLng: 119.5
};

const result = await elevationService.getContoursForBounds(bounds);
console.log(result);
// {
//   type: 'FeatureCollection',
//   features: [ /* GeoJSON 特征数组 */ ],
//   tiles: ['srtm_60_07']
// }
```

## 故障排查

### 显示"无覆盖数据"

**可能原因：**
1. 坐标不在数据覆盖范围内（lat 20-35°N, lng 115-125°E）
2. GeoTIFF 文件加载失败
3. 坐标格式错误

**解决方法：**
1. 检查浏览器控制台是否有错误
2. 确认坐标在覆盖范围内
3. 检查网络请求是否成功（开发者工具 → Network 标签页）

### 等高线不显示

**可能原因：**
1. 当前视口范围内没有数据覆盖
2. 等高线生成失败
3. 地图缩放级别太高或太低

**解决方法：**
1. 检查浏览器控制台的 `[ElevationService]` 和 `[ContourOverlay]` 日志
2. 确认地图中心在数据覆盖范围内
3. 尝试调整地图缩放级别

### 性能问题

**可能原因：**
1. 等高线密度太高
2. 内存缓存未命中

**解决方法：**
1. 调整等高线参数（增大 `thresholdStep`）
2. 减少最大等高线数量（`maxContours`）
3. 确保浏览器缓存已启用

## 配置选项

可以在使用服务时传入配置选项：

```javascript
const result = await elevationService.getContoursForBounds(bounds, {
  sampleSize: 512,      // 采样大小（像素）
  thresholdStep: 50,    // 等高线间隔（米）
  maxContours: 12,      // 最大等高线数量
  force: false          // 是否强制重新生成（跳过缓存）
});
```

## 维护建议

1. **定期检查缓存大小**：内存缓存会随着使用增长，可在适当时候调用 `clearCaches()`
2. **监控网络请求**：确保 GeoTIFF 文件能正常加载
3. **更新数据时**：如果更新 GeoTIFF 文件，需要：
   - 修改文件名或添加版本号（推荐）
   - 或者清除用户浏览器缓存
   - 或者修改服务器端 Cache-Control 响应头
