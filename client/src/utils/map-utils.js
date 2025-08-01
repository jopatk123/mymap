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
 * 创建自定义全景图标记
 * @param {Array} latlng [lat, lng]
 * @param {Object} options 选项
 * @returns {L.Marker}
 */
export function createPanoramaMarker(latlng, options = {}) {
  const icon = L.divIcon({
    className: 'panorama-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      background-color: #ff4444;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })

  return L.marker(latlng, { icon, ...options })
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