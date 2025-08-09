/**
 * 坐标转换工具
 * 支持 WGS84、GCJ02、BD09 坐标系之间的转换
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
 * WGS84转GCJ02 (GPS转高德)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function wgs84ToGcj02(lng, lat) {
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
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function gcj02ToWgs84(lng, lat) {
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
 * GCJ02转BD09 (高德转百度)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * PI * 3000.0 / 180.0)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * PI * 3000.0 / 180.0)
  const bdLng = z * Math.cos(theta) + 0.0065
  const bdLat = z * Math.sin(theta) + 0.006
  return [bdLng, bdLat]
}

/**
 * BD09转GCJ02 (百度转高德)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * PI * 3000.0 / 180.0)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * PI * 3000.0 / 180.0)
  const gcjLng = z * Math.cos(theta)
  const gcjLat = z * Math.sin(theta)
  return [gcjLng, gcjLat]
}

/**
 * WGS84转BD09 (GPS转百度)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function wgs84ToBd09(lng, lat) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
  return gcj02ToBd09(gcjLng, gcjLat)
}

/**
 * BD09转WGS84 (百度转GPS)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function bd09ToWgs84(lng, lat) {
  const [gcjLng, gcjLat] = bd09ToGcj02(lng, lat)
  return gcj02ToWgs84(gcjLng, gcjLat)
}

/**
 * 计算两点间距离（米）
 * @param {number} lat1 纬度1
 * @param {number} lng1 经度1
 * @param {number} lat2 纬度2
 * @param {number} lng2 经度2
 * @returns {number} 距离（米）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // 地球半径（米）
  const dLat = (lat2 - lat1) * PI / 180
  const dLng = (lng2 - lng1) * PI / 180
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * PI / 180) * Math.cos(lat2 * PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 通用坐标转换函数
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @param {string} from 源坐标系 'wgs84' | 'gcj02' | 'bd09'
 * @param {string} to 目标坐标系 'wgs84' | 'gcj02' | 'bd09'
 * @returns {Array} [lng, lat]
 */
function convertCoordinate(lng, lat, from, to) {
  if (from === to) {
    return [lng, lat]
  }
  
  // 转换映射表
  const converters = {
    'wgs84_gcj02': wgs84ToGcj02,
    'gcj02_wgs84': gcj02ToWgs84,
    'gcj02_bd09': gcj02ToBd09,
    'bd09_gcj02': bd09ToGcj02,
    'wgs84_bd09': wgs84ToBd09,
    'bd09_wgs84': bd09ToWgs84
  }
  
  const key = `${from}_${to}`
  const converter = converters[key]
  
  if (!converter) {
    throw new Error(`不支持的坐标转换: ${from} -> ${to}`)
  }
  
  return converter(lng, lat)
}

module.exports = {
  isInChina,
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  calculateDistance,
  convertCoordinate
}