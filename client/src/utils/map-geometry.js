import { wgs84ToGcj02, gcj02ToWgs84 } from './coordinate-transform.js';

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
    const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
    return [gcjLat, gcjLng];
  }

  /**
   * 将高德坐标转换为WGS84
   * @param {number} lat 纬度
   * @param {number} lng 经度
   * @returns {Array} [lat, lng]
   */
  static aMapToWgs84(lat, lng) {
    const [wgsLng, wgsLat] = gcj02ToWgs84(lng, lat);
    return [wgsLat, wgsLng];
  }
}

/**
 * 计算两点间距离（米）
 * @param {Array} point1 [lat, lng]
 * @param {Array} point2 [lat, lng]
 * @returns {number} 距离（米）
 */
export function calculateDistance(point1, point2) {
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;

  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 获取地图边界内的点
 * @param {L.Map} map Leaflet地图实例
 * @param {Array} points 点数组 [{lat, lng, ...}]
 * @returns {Array} 边界内的点
 */
export function getPointsInBounds(map, points) {
  const bounds = map.getBounds();
  return points.filter((point) => bounds.contains([point.lat, point.lng]));
}
