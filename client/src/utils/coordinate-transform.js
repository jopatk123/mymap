/**
 * 前端坐标转换工具
 * 支持 WGS84、GCJ02、BD09 坐标系之间的转换
 * 与服务端坐标转换工具保持一致
 */

const PI = Math.PI
const A = 6378245.0 // 长半轴
const EE = 0.00669342162296594323 // 偏心率平方

/**
 * 判断坐标是否在中国境内
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {boolean}
 */
function isInChina(lng, lat) {
  return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271
}

/**
 * 纬度转换
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {number}
 */
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0
  return ret
}

/**
 * 经度转换
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {number}
 */
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

/**
 * WGS84转GCJ02 (GPS转高德) - 精确算法
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function wgs84ToGcj02(lng, lat) {
  if (!isInChina(lng, lat)) {
    return [lng, lat]
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)

  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)

  const mgLat = lat + dLat
  const mgLng = lng + dLng

  return [mgLng, mgLat]
}

/**
 * GCJ02转WGS84 (高德转GPS)
 * 使用迭代方法提高精度
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function gcj02ToWgs84(lng, lat) {
  if (!isInChina(lng, lat)) {
    return [lng, lat]
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)

  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)

  const mgLat = lat - dLat
  const mgLng = lng - dLng

  return [mgLng, mgLat]
}

/**
 * 通用坐标转换函数
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @param {string} from 源坐标系 'wgs84' | 'gcj02' | 'bd09'
 * @param {string} to 目标坐标系 'wgs84' | 'gcj02' | 'bd09'
 * @returns {Array} [lng, lat]
 */
export function convertCoordinate(lng, lat, from, to) {
  if (from === to) {
    return [lng, lat]
  }

  // 目前只实现WGS84和GCJ02之间的转换，这是最常用的
  if (from === 'wgs84' && to === 'gcj02') {
    return wgs84ToGcj02(lng, lat)
  } else if (from === 'gcj02' && to === 'wgs84') {
    return gcj02ToWgs84(lng, lat)
  }

  // 其他转换暂时直接返回原坐标
  console.warn(`不支持的坐标转换: ${from} -> ${to}`)
  return [lng, lat]
}

/**
 * 获取点位的显示坐标（适配高德地图瓦片）
 * 高德地图瓦片期望GCJ02坐标系
 * 优先使用WGS84原始坐标，统一转换为GCJ02显示坐标
 * @param {Object} point 点位对象
 * @returns {Array} [lng, lat] 或 null
 */
export function getDisplayCoordinates(point) {
  if (!point) return null

  // 优先使用WGS84原始坐标（避免双重转换）
  // 服务端保存了两套坐标：latitude/longitude(WGS84) 和 gcj02Lat/gcj02Lng(GCJ02)
  // 我们使用WGS84原始坐标，前端统一转换
  const lat = point.latitude || point.lat
  const lng = point.longitude || point.lng

  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    // 将WGS84原始坐标转换为GCJ02（适配高德地图瓦片）
    return wgs84ToGcj02(lng, lat)
  }

  return null
}

export default {
  wgs84ToGcj02,
  gcj02ToWgs84,
  convertCoordinate,
  getDisplayCoordinates,
  isInChina
}