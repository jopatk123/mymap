/**
 * 等高线调试工具
 * 用于诊断等高线不显示的问题
 */

import { wgs84ToGcj02 } from '@/utils/coordinate-transform.js';
import logger from '@/utils/logger.js';

/**
 * 检查坐标转换
 */
export function debugCoordinateTransform() {
  logger.debug('=== 坐标转换测试 ===');

  // 测试点：上海中心区域 (WGS84)
  const testPoints = [
    { lng: 121.5, lat: 31.2, name: '上海中心' },
    { lng: 120.5, lat: 30.5, name: '杭州附近' },
    { lng: 116.4, lat: 39.9, name: '北京' },
  ];

  testPoints.forEach(({ lng, lat, name }) => {
    const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
    const deltaLng = gcjLng - lng;
    const deltaLat = gcjLat - lat;
    logger.debug(`${name}:`, {
      wgs84: [lng, lat],
      gcj02: [gcjLng, gcjLat],
      delta: [deltaLng, deltaLat],
      deltaMeters: [deltaLng * 111000, deltaLat * 111000],
    });
  });
}

/**
 * 检查 GeoJSON 特征的坐标范围
 */
export function debugFeatureBounds(features) {
  if (!features || features.length === 0) {
    console.warn('[debug] 没有特征');
    return null;
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  features.forEach((feature) => {
    if (feature.geometry?.type === 'MultiLineString') {
      feature.geometry.coordinates.forEach((lineString) => {
        lineString.forEach(([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });
      });
    }
  });

  const bounds = { minLng, maxLng, minLat, maxLat };
  logger.debug('[debug] 特征边界:', bounds);
  return bounds;
}

/**
 * 检查多边形和特征是否重叠
 */
export function debugOverlap(polygonBounds, featureBounds) {
  logger.debug('[debug] 多边形边界:', polygonBounds);
  logger.debug('[debug] 特征边界:', featureBounds);

  const overlapsLng =
    polygonBounds.minLng <= featureBounds.maxLng && polygonBounds.maxLng >= featureBounds.minLng;
  const overlapsLat =
    polygonBounds.minLat <= featureBounds.maxLat && polygonBounds.maxLat >= featureBounds.minLat;

  const overlaps = overlapsLng && overlapsLat;

  logger.debug('[debug] 是否重叠:', {
    overlaps,
    overlapsLng,
    overlapsLat,
  });

  return overlaps;
}

/**
 * 打印完整的调试信息
 */
export function debugContourRendering(region, features) {
  logger.debug('=== 等高线渲染调试 ===');
  logger.debug('1. 绘制区域信息:');
  logger.debug('   - 点数:', region.latLngs?.length);
  logger.debug('   - 边界:', region.bounds);
  logger.debug('2. 等高线特征信息:');
  logger.debug('   - 特征数:', features.length);

  const featureBounds = debugFeatureBounds(features);

  if (region.bounds && featureBounds) {
    logger.debug('3. 重叠检查:');
    debugOverlap(
      {
        minLng: region.bounds.getWest?.() ?? region.bounds.minLng,
        maxLng: region.bounds.getEast?.() ?? region.bounds.maxLng,
        minLat: region.bounds.getSouth?.() ?? region.bounds.minLat,
        maxLat: region.bounds.getNorth?.() ?? region.bounds.maxLat,
      },
      featureBounds
    );
  }

  logger.debug('=== 调试结束 ===');
}
