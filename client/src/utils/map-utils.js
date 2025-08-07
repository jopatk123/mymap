import L from 'leaflet'
import { wgs84ToGcj02, gcj02ToWgs84 } from './coordinate.js'

/**
 * 创建高德地图瓦片层
 * @param {string} type 地图类型 'normal' | 'satellite' | 'roadnet'
 * @returns {L.TileLayer}
 */
export function createAMapTileLayer(type = 'normal') {
  const urls = {
    normal: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    satellite: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    roadnet: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}'
  }

  return L.tileLayer(urls[type], {
    subdomains: ['1', '2', '3', '4'],
    attribution: '© 高德地图',
    maxZoom: 18
  })
}

/**
 * 获取图标形状HTML - 固定使用marker形状
 * @param {number} size 图标大小
 * @param {string} color 图标颜色
 * @param {number} opacity 透明度
 * @returns {string} HTML字符串
 */
function getIconShapeHtml(size, color, opacity) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3.2}" viewBox="0 0 25 41" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <path fill="${color}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${opacity}"/>
    <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
    <circle fill="${color}" cx="12.5" cy="12.5" r="3" opacity="${opacity}"/>
  </svg>`
}

/**
 * 创建自定义全景图标记
 * @param {Array} latlng [lat, lng]
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createPanoramaMarker(latlng, options = {}, styleConfig = null) {
  if (!window.panoramaPointStyles) {
    window.panoramaPointStyles = {
      point_color: '#2ed573',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 12,
      point_label_color: '#000000'
    }
  }

  const styles = styleConfig ?? window.panoramaPointStyles
  const labelText = options.title || '全景图'
  const labelSize = styles.point_label_size || 12

  if (labelSize === 0) {
    const iconHtml = getIconShapeHtml(
      styles.point_size,
      styles.point_color,
      styles.point_opacity
    )
    const iconSize = [styles.point_size * 2, styles.point_size * 3.2];
    const iconAnchor = [styles.point_size, styles.point_size * 3.2];
    const icon = L.divIcon({
      className: 'panorama-marker',
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: iconAnchor
    })
    return L.marker(latlng, { icon, ...options })
  }

  const getLabelPosition = (size, labelSize) => {
    return { top: `-${size * 1.2 + labelSize + 4}px`, marginBottom: '2px' }
  }

  const labelPosition = getLabelPosition(styles.point_size, labelSize)
  const iconHtml = `
    <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
      <div style="
        position: absolute;
        left: 50%;
        top: ${labelPosition.top};
        transform: translateX(-50%);
        margin-bottom: ${labelPosition.marginBottom};
        padding: 2px 5px;
        background-color: rgba(255, 255, 255, 0.75);
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        white-space: nowrap;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
        font-size: ${labelSize}px;
        color: ${styles.point_label_color};
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        display: inline-block !important;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        z-index: 1000;
      ">
        ${labelText}
      </div>
      ${getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity)}
    </div>
  `

  const iconHeight = styles.point_size * 3.2;
  const totalHeight = iconHeight + labelSize + 8;
  const iconSize = [styles.point_size * 2, totalHeight];
  const anchorY = iconHeight + labelSize + 4;
  const iconAnchor = [styles.point_size, anchorY];

  const icon = L.divIcon({
    className: 'panorama-marker',
    html: iconHtml,
    iconSize: iconSize,
    iconAnchor: iconAnchor
  })

  return L.marker(latlng, { icon, ...options })
}

/**
 * 创建自定义视频点位标记
 * @param {Array} latlng [lat, lng]
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createVideoMarker(latlng, options = {}, styleConfig = null) {
  if (!window.videoPointStyles) {
    window.videoPointStyles = {
      point_color: '#ff4757',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 14,
      point_label_color: '#000000'
    }
  }

  const styles = styleConfig ?? window.videoPointStyles
  const labelText = options.title || '视频点位'
  const labelSize = styles.point_label_size || 14

  if (labelSize === 0) {
    const iconHtml = getIconShapeHtml(
      styles.point_size,
      styles.point_color,
      styles.point_opacity
    )
    const iconSize = [styles.point_size * 2, styles.point_size * 3.2]
    const iconAnchor = [styles.point_size, styles.point_size * 3.2]
    const icon = L.divIcon({
      className: 'video-marker',
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: iconAnchor
    })
    return L.marker(latlng, { icon, ...options })
  }

  const getLabelPosition = (size, labelSize) => {
    return { top: `-${size * 1.2 + labelSize + 4}px`, marginBottom: '2px' }
  }

  const labelPosition = getLabelPosition(styles.point_size, labelSize)
  const iconHtml = `
    <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
      <div style="
        position: absolute;
        left: 50%;
        top: ${labelPosition.top};
        transform: translateX(-50%);
        margin-bottom: ${labelPosition.marginBottom};
        padding: 2px 5px;
        background-color: rgba(255, 255, 255, 0.75);
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        white-space: nowrap;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
        font-size: ${labelSize}px;
        color: ${styles.point_label_color};
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        display: inline-block !important;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        z-index: 1000;
      ">
        ${labelText}
      </div>
      ${getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity)}
    </div>
  `

  const iconHeight = styles.point_size * 3.2
  const totalHeight = iconHeight + labelSize + 8
  const iconSize = [styles.point_size * 2, totalHeight]

  const anchorY = iconHeight + labelSize + 4
  const iconAnchor = [styles.point_size, anchorY]

  const icon = L.divIcon({
    className: 'video-marker',
    html: iconHtml,
    iconSize: iconSize,
    iconAnchor: iconAnchor
  })

  return L.marker(latlng, { icon, ...options })
}

/**
 * 根据点位类型创建对应的标记
 * @param {Array} latlng [lat, lng]
 * @param {string} type 点位类型 'panorama' | 'video'
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createPointMarker(latlng, type, options = {}, styleConfig = null) {
  switch (type) {
    case 'video':
      return createVideoMarker(latlng, options, styleConfig)
    case 'panorama':
    default:
      return createPanoramaMarker(latlng, options, styleConfig)
  }
}

/**
 * 坐标转换工具类
 */
export class CoordinateConverter {
  /**
   * 将WGS84坐标转换为适合高德瓦片的坐标
   * @param {number} lat 纬度
   * @param {number} lng 经度
   * @returns {Array} [lat, lng]
   */
  static wgs84ToAMap(lat, lng) {
    // 对于高德瓦片，我们需要使用GCJ02坐标系
    // 但Leaflet使用WGS84，所以这里做一个近似转换
    const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
    return [gcjLat, gcjLng]
  }

  /**
   * 将高德坐标转换为WGS84
   * @param {number} lat 纬度
   * @param {number} lng 经度
   * @returns {Array} [lat, lng]
   */
  static aMapToWgs84(lat, lng) {
    const [wgsLng, wgsLat] = gcj02ToWgs84(lng, lat)
    return [wgsLat, wgsLng]
  }
}

/**
 * 计算两点间距离（米）
 * @param {Array} point1 [lat, lng]
 * @param {Array} point2 [lat, lng]
 * @returns {number} 距离（米）
 */
export function calculateDistance(point1, point2) {
  const [lat1, lng1] = point1
  const [lat2, lng2] = point2

  const R = 6371000 // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 获取地图边界内的点
 * @param {L.Map} map Leaflet地图实例
 * @param {Array} points 点数组 [{lat, lng, ...}]
 * @returns {Array} 边界内的点
 */
export function getPointsInBounds(map, points) {
  const bounds = map.getBounds()
  return points.filter(point => bounds.contains([point.lat, point.lng]))
}
