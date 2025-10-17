# 高程服务文档

## 功能概述

高程服务提供以下功能：

1. **实时高程查询**：鼠标移动时显示当前位置的经纬度和海拔高程

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

客户端 JavaScript 代码实现了瓦片缓存：

#### 瓦片缓存（Tile Cache）

- 位置：`tile-loader.js`
- 缓存内容：已加载的 GeoTIFF 瓦片的元数据和图像对象
- 生命周期：页面会话期间
- 作用：避免重复解析同一个 GeoTIFF 文件

### 清除缓存

```javascript
import { elevationService } from '@/services/elevation';

// 清除所有缓存
elevationService.clearCaches();
```

---

## 已删除的功能

**等高线显示功能已被删除。** 以下方法不再可用：

- `getContoursForBounds()` ❌（已删除）
- `getTileContours()` ❌（已删除）

相关的文档（如 `CONTOUR_DRAWING.md`、`CONTOUR_DEBUG.md`）已标记为已废弃。
