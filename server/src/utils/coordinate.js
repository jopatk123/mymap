/**
 * 坐标转换工具类
 * 支持WGS84、GCJ02、BD09坐标系之间的转换
 */

const PI = Math.PI;
const X_PI = (PI * 3000.0) / 180.0;
const A = 6378245.0;
const EE = Number('0.00669342162296594323');

/**
 * 判断坐标是否在中国境内
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {boolean}
 */
function isInChina(lng, lat) {
  return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
}

/**
 * 转换偏移量
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [dlng, dlat]
 */
function transformOffset(lng, lat) {
  let dlat =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng));
  dlat += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  dlat += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
  dlat += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0;

  let dlng =
    300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  dlng += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  dlng += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
  dlng += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0;

  return [dlng, dlat];
}

/**
 * WGS84转GCJ02 (GPS转高德)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function wgs84ToGcj02(lng, lat) {
  if (!isInChina(lng, lat)) {
    return [lng, lat];
  }

  const [dlng, dlat] = transformOffset(lng, lat);
  const radlat = (lat / 180.0) * PI;
  let magic = Math.sin(radlat);
  magic = 1 - EE * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  const adjustLng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI);
  const adjustLat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI);

  return [lng + adjustLng, lat + adjustLat];
}

/**
 * GCJ02转WGS84 (高德转GPS)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function gcj02ToWgs84(lng, lat) {
  if (!isInChina(lng, lat)) {
    return [lng, lat];
  }

  const [dlng, dlat] = transformOffset(lng, lat);
  const radlat = (lat / 180.0) * PI;
  let magic = Math.sin(radlat);
  magic = 1 - EE * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  const adjustLng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI);
  const adjustLat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI);

  return [lng - adjustLng, lat - adjustLat];
}

/**
 * GCJ02转BD09 (高德转百度)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return [bdLng, bdLat];
}

/**
 * BD09转GCJ02 (百度转高德)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
  const gcjLng = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);
  return [gcjLng, gcjLat];
}

/**
 * WGS84转BD09 (GPS转百度)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function wgs84ToBd09(lng, lat) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcjLng, gcjLat);
}

/**
 * BD09转WGS84 (百度转GPS)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {Array} [lng, lat]
 */
function bd09ToWgs84(lng, lat) {
  const [gcjLng, gcjLat] = bd09ToGcj02(lng, lat);
  return gcj02ToWgs84(gcjLng, gcjLat);
}

/**
 * 验证坐标是否有效
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {boolean}
 */
function isValidCoordinate(lng, lat) {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90 &&
    !isNaN(lng) &&
    !isNaN(lat)
  );
}

module.exports = {
  isInChina,
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  isValidCoordinate,
};
