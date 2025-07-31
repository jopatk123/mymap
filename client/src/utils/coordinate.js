import proj4 from 'proj4'

// 定义坐标系
const WGS84 = 'EPSG:4326' // GPS坐标系
const GCJ02 = '+proj=longlat +datum=WGS84 +no_defs +type=crs' // 高德坐标系(近似)
const BD09 = '+proj=longlat +datum=WGS84 +no_defs +type=crs' // 百度坐标系(近似)

/**
 * WGS84转GCJ02 (GPS转高德)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function wgs84ToGcj02(lng, lat) {
  const a = 6378245.0
  const ee = 0.00669342162296594323
  
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  
  const radLat = lat / 180.0 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI)
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI)
  
  return [lng + dLng, lat + dLat]
}

/**
 * GCJ02转WGS84 (高德转GPS)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function gcj02ToWgs84(lng, lat) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
  return [lng * 2 - gcjLng, lat * 2 - gcjLat]
}

/**
 * GCJ02转BD09 (高德转百度)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * Math.PI * 3000.0 / 180.0)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * Math.PI * 3000.0 / 180.0)
  return [z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006]
}

/**
 * BD09转GCJ02 (百度转高德)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0)
  return [z * Math.cos(theta), z * Math.sin(theta)]
}

/**
 * WGS84转BD09 (GPS转百度)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function wgs84ToBd09(lng, lat) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
  return gcj02ToBd09(gcjLng, gcjLat)
}

/**
 * BD09转WGS84 (百度转GPS)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
export function bd09ToWgs84(lng, lat) {
  const [gcjLng, gcjLat] = bd09ToGcj02(lng, lat)
  return gcj02ToWgs84(gcjLng, gcjLat)
}

// 辅助函数
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0
  return ret
}

/**
 * 判断坐标是否在中国境内
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {boolean}
 */
export function isInChina(lng, lat) {
  return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271
}