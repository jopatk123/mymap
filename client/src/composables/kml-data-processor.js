import { wgs84ToGcj02 } from '@/utils/coordinate-transform.js';

export function processCoordinates(data) {
  if (Array.isArray(data)) {
    // 处理坐标数组
    return data
      .map((coord) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          const [lng, lat] = coord;
          const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(lng, lat);
          return [gcj02Lng, gcj02Lat];
        }
        return null;
      })
      .filter(Boolean);
  } else if (typeof data === 'object' && data !== null) {
    // 处理点位对象
    let displayLat, displayLng;

    // 优先使用原始WGS84坐标（如果存在），转换为GCJ02
    if (data.latitude != null && data.longitude != null) {
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(data.longitude, data.latitude);
      displayLat = gcj02Lat;
      displayLng = gcj02Lng;
    }
    // 如果没有原始坐标，直接使用GCJ02坐标
    else if (data.gcj02_lat != null && data.gcj02_lng != null) {
      displayLat = data.gcj02_lat;
      displayLng = data.gcj02_lng;
    }

    if (displayLat != null && displayLng != null && !isNaN(displayLat) && !isNaN(displayLng)) {
      return { lat: displayLat, lng: displayLng };
    }
  }

  return null;
}

export function extractCoordinatesFromText(coordinatesText) {
  if (!coordinatesText) return [];

  return coordinatesText
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lng, lat] = pair.split(',').map(parseFloat);
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(lng, lat);
      return [gcj02Lng, gcj02Lat];
    })
    .filter((c) => !isNaN(c[0]) && !isNaN(c[1]));
}

export function createFeatureData(
  name,
  description,
  geometryType,
  coordinates,
  wgs84LatLng = null
) {
  const feature = {
    type: 'Feature',
    properties: {
      name: name || '未命名要素',
      description: description || '',
    },
    geometry: {
      type: geometryType,
      coordinates: coordinates,
    },
  };

  // 附带原始WGS84坐标（用于弹窗展示），仅对点要素有意义
  if (
    geometryType === 'Point' &&
    wgs84LatLng &&
    typeof wgs84LatLng.lat === 'number' &&
    typeof wgs84LatLng.lng === 'number'
  ) {
    feature.properties.wgs84_lat = wgs84LatLng.lat;
    feature.properties.wgs84_lng = wgs84LatLng.lng;
  }

  return feature;
}
