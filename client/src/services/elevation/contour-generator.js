import { contours as d3Contours } from 'd3-contour';
import { wgs84ToGcj02 } from '@/utils/coordinate-transform.js';
import logger from '@/utils/logger.js';

function collectValidRange(values, noDataValue) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let count = 0;
  const validValues = [];

  for (const value of values) {
    if (value === undefined || value === null || Number.isNaN(value)) continue;

    const numeric = Number(value);

    // 过滤明显的无效值
    if (numeric < -10000 || numeric > 10000) continue; // 地球海拔范围约 -430m 到 8850m
    if (noDataValue !== undefined && noDataValue !== null && numeric === Number(noDataValue)) {
      continue;
    }

    validValues.push(numeric);
  }

  if (validValues.length === 0) {
    return null;
  }

  // 使用分位数来排除异常值
  validValues.sort((a, b) => a - b);
  const p1 = Math.floor(validValues.length * 0.01); // 1% 分位
  const p99 = Math.floor(validValues.length * 0.99); // 99% 分位

  for (let i = p1; i < p99; i++) {
    const value = validValues[i];
    if (value < min) min = value;
    if (value > max) max = value;
    count++;
  }

  if (count === 0) {
    return null;
  }

  return { min, max };
}

function buildThresholds(range, step = 20, maxCount = 50) {
  if (!range) {
    return { thresholds: [], step: step > 0 ? step : 20 };
  }

  const safeStep = step > 0 ? step : 20;
  const start = Math.floor(range.min / safeStep) * safeStep;
  const end = Math.ceil(range.max / safeStep) * safeStep;
  const span = end - start;
  const limit = Math.max(1, maxCount);
  const rawCount = span <= 0 ? 1 : Math.floor(span / safeStep) + 1;
  const multiplier = Math.max(1, Math.ceil(rawCount / limit));
  const adjustedStep = safeStep * multiplier;

  const thresholds = [];
  for (let value = start; value <= end; value += adjustedStep) {
    thresholds.push(value);
    if (thresholds.length >= limit) {
      break;
    }
  }

  return { thresholds, step: adjustedStep };
}

function pixelToWorld(x, y, width, height, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lng = minLng + (x / Math.max(width - 1, 1)) * (maxLng - minLng);
  const lat = maxLat - (y / Math.max(height - 1, 1)) * (maxLat - minLat);
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  return [gcjLng, gcjLat];
}

function contourToFeature(contour, width, height, bbox, spacing) {
  const lines = [];
  for (const polygon of contour.coordinates) {
    for (const ring of polygon) {
      if (!Array.isArray(ring)) continue;
      const line = ring
        .map(([x, y]) => pixelToWorld(x, y, width, height, bbox))
        .filter((coord) => Array.isArray(coord) && coord.length === 2);
      if (line.length > 1) {
        lines.push(line);
      }
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return {
    type: 'Feature',
    properties: {
      elevation: contour.value,
      spacing,
    },
    geometry: {
      type: 'MultiLineString',
      coordinates: lines,
    },
  };
}

export function generateContourFeatures({
  width,
  height,
  values,
  bbox,
  noDataValue,
  thresholdStep = 20,
  maxContours = 50,
}) {
  if (!values || !width || !height || !bbox) {
    return [];
  }

  const dataArray = Array.isArray(values) ? values : Array.from(values);

  const range = collectValidRange(dataArray, noDataValue);
  const { thresholds, step } = buildThresholds(range, thresholdStep, maxContours);

  const thresholdRange =
    thresholds.length > 0 ? [thresholds[0], thresholds[thresholds.length - 1]] : [];
  logger.debug('[contour-gen] 数据:', {
    range,
    thresholds: thresholds.length,
    step,
    thresholdRange,
  });

  if (!thresholds.length) return [];

  const contourBuilder = d3Contours().size([width, height]).smooth(true).thresholds(thresholds);
  const contours = contourBuilder(dataArray);

  const features = contours
    .map((contour) => contourToFeature(contour, width, height, bbox, step))
    .filter(Boolean);

  logger.debug('[contour-gen] 结果:', {
    contours: contours.length,
    features: features.length,
  });

  return features;
}
