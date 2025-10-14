import { contours as d3Contours } from 'd3-contour';
import { wgs84ToGcj02 } from '@/utils/coordinate-transform.js';

function collectValidRange(values, noDataValue) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let count = 0;
  for (const value of values) {
    if (value === undefined || value === null || Number.isNaN(value)) continue;
    if (
      noDataValue !== undefined &&
      noDataValue !== null &&
      Number(value) === Number(noDataValue)
    ) {
      continue;
    }
    const numeric = Number(value);
    if (numeric < min) min = numeric;
    if (numeric > max) max = numeric;
    count += 1;
  }
  if (count === 0) {
    return null;
  }
  return { min, max };
}

function buildThresholds(range, step = 50, maxCount = 12) {
  if (!range) return [];
  const safeStep = step <= 0 ? 50 : step;
  const start = Math.floor(range.min / safeStep) * safeStep;
  const end = Math.ceil(range.max / safeStep) * safeStep;
  const thresholds = [];
  for (let value = start; value <= end; value += safeStep) {
    thresholds.push(value);
    if (thresholds.length >= maxCount) break;
  }
  return thresholds;
}

function pixelToWorld(x, y, width, height, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lng = minLng + (x / Math.max(width - 1, 1)) * (maxLng - minLng);
  const lat = maxLat - (y / Math.max(height - 1, 1)) * (maxLat - minLat);
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  return [gcjLng, gcjLat];
}

function contourToFeature(contour, width, height, bbox) {
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
  thresholdStep = 50,
  maxContours = 12,
}) {
  if (!values || !width || !height || !bbox) {
    return [];
  }

  const dataArray = Array.isArray(values) ? values : Array.from(values);

  const range = collectValidRange(dataArray, noDataValue);
  const thresholds = buildThresholds(range, thresholdStep, maxContours);
  if (!thresholds.length) return [];

  const contourBuilder = d3Contours().size([width, height]).smooth(true).thresholds(thresholds);
  const contours = contourBuilder(dataArray);

  return contours.map((contour) => contourToFeature(contour, width, height, bbox)).filter(Boolean);
}
