import { createTileLoader } from './tile-loader.js';
import {
  elevationTileManifest,
  findTileByCoordinate,
  tilesIntersectingBounds,
} from './manifest.js';
import { bilinearInterpolation, formatCoordinate, roundElevation } from './interpolation.js';
import { generateContourFeatures } from './contour-generator.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeBounds(bounds) {
  if (!bounds) return null;
  if (typeof bounds.getSouth === 'function') {
    return {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    };
  }
  const minLat = Number(bounds.minLat ?? bounds.south ?? bounds.minLatitude ?? bounds.latitudeMin);
  const maxLat = Number(bounds.maxLat ?? bounds.north ?? bounds.maxLatitude ?? bounds.latitudeMax);
  const minLng = Number(bounds.minLng ?? bounds.west ?? bounds.minLongitude ?? bounds.longitudeMin);
  const maxLng = Number(bounds.maxLng ?? bounds.east ?? bounds.maxLongitude ?? bounds.longitudeMax);
  if ([minLat, maxLat, minLng, maxLng].some((value) => Number.isNaN(value))) {
    return null;
  }
  return { minLat, maxLat, minLng, maxLng };
}

async function readWindow(image, windowBounds) {
  const { x0, y0, x1, y1 } = windowBounds;
  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const raster = await image.readRasters({
    window: [x0, y0, x1 + 1, y1 + 1],
    width,
    height,
    interleave: true,
    samples: [0],
    resampleMethod: 'nearest',
  });
  return { raster, width, height };
}

function extractPixelWindow(meta, lat, lng) {
  const { width, height, bbox } = meta;
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const x = ((lng - minLng) / (maxLng - minLng)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  const x0 = clamp(Math.floor(x), 0, width - 1);
  const y0 = clamp(Math.floor(y), 0, height - 1);
  const x1 = clamp(x0 + 1, 0, width - 1);
  const y1 = clamp(y0 + 1, 0, height - 1);
  const xRatio = clamp(x - x0, 0, 1);
  const yRatio = clamp(y - y0, 0, 1);
  return {
    window: { x0, y0, x1, y1 },
    ratios: { xRatio, yRatio },
  };
}

function flattenWindowValues(readResult, noDataValue) {
  const { raster, width, height } = readResult;
  if (!raster || raster.length === 0) {
    return { values: [], valid: false };
  }
  if (width === 1 && height === 1) {
    const value = Number(raster[0]);
    if (Number.isNaN(value)) return { values: [], valid: false };
    if (
      noDataValue !== undefined &&
      noDataValue !== null &&
      Number(value) === Number(noDataValue)
    ) {
      return { values: [], valid: false };
    }
    return { values: [value, value, value, value], valid: true };
  }
  if (width === 2 && height === 2) {
    return { values: Array.from(raster, (value) => Number(value)), valid: true };
  }

  const collected = [];
  const clampIndex = (index) => clamp(index, 0, raster.length - 1);
  collected.push(Number(raster[0]));
  collected.push(Number(raster[clampIndex(1)]));
  collected.push(Number(raster[clampIndex(width)]));
  collected.push(Number(raster[clampIndex(width + 1)]));
  return { values: collected, valid: true };
}

export function createElevationService(options = {}) {
  const {
    manifest = elevationTileManifest,
    tileLoaderFactory = createTileLoader,
    tileLoaderOptions,
    contourOptions = {},
  } = options;

  const tileLoader = tileLoaderFactory(tileLoaderOptions);
  const contourCache = new Map();

  const ensureTileRecord = async (tile) => {
    if (!tile) return null;
    return tileLoader.loadTile(tile);
  };

  const getElevation = async (lat, lng) => {
    if (lat === undefined || lng === undefined) {
      return { hasData: false, elevation: null, tileId: null, lat: null, lng: null };
    }
    const tile =
      findTileByCoordinate(lat, lng, manifest) ||
      manifest.find((entry) => entry.contains?.(lat, lng));
    if (!tile) {
      return {
        hasData: false,
        elevation: null,
        tileId: null,
        lat: formatCoordinate(lat),
        lng: formatCoordinate(lng),
      };
    }

    const record = await ensureTileRecord(tile);
    if (!record) {
      return {
        hasData: false,
        elevation: null,
        tileId: tile.id,
        lat: formatCoordinate(lat),
        lng: formatCoordinate(lng),
      };
    }

    const { ratios, window } = extractPixelWindow(record.meta, lat, lng);
    const readResult = await readWindow(record.image, window);
    const { values, valid } = flattenWindowValues(readResult, record.meta.noDataValue);
    if (!valid) {
      return {
        hasData: false,
        elevation: null,
        tileId: tile.id,
        lat: formatCoordinate(lat),
        lng: formatCoordinate(lng),
      };
    }

    const elevation = bilinearInterpolation(
      ratios.xRatio,
      ratios.yRatio,
      values,
      record.meta.noDataValue
    );
    return {
      hasData: elevation !== null,
      elevation: elevation !== null ? roundElevation(elevation) : null,
      tileId: tile.id,
      lat: formatCoordinate(lat),
      lng: formatCoordinate(lng),
    };
  };

  const getTileContours = async (tile, overrides = {}) => {
    if (!tile) return [];
    if (!overrides.force && contourCache.has(tile.id)) {
      return contourCache.get(tile.id);
    }
    const record = await ensureTileRecord(tile);
    if (!record) {
      contourCache.set(tile.id, []);
      return [];
    }
    const sampleSize = overrides.sampleSize ?? contourOptions.sampleSize ?? 512;
    const aspect = record.meta.height / record.meta.width;
    const width = sampleSize;
    const height = Math.max(1, Math.round(sampleSize * aspect));
    const raster = await record.image.readRasters({
      width,
      height,
      samples: [0],
      interleave: true,
      resampleMethod: 'bilinear',
    });
    const features = generateContourFeatures({
      width,
      height,
      values: raster,
      bbox: record.meta.bbox,
      noDataValue: record.meta.noDataValue,
      thresholdStep: overrides.thresholdStep ?? contourOptions.thresholdStep ?? 50,
      maxContours: overrides.maxContours ?? contourOptions.maxContours ?? 12,
    }).map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        tileId: tile.id,
      },
    }));
    contourCache.set(tile.id, features);
    return features;
  };

  const getContoursForBounds = async (bounds, overrides = {}) => {
    const normalizedBounds = normalizeBounds(bounds);
  const tiles = overrides.tiles ?? tilesIntersectingBounds(normalizedBounds, manifest);
    if (!tiles || tiles.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }
    const results = await Promise.all(tiles.map((tile) => getTileContours(tile, overrides)));
    return {
      type: 'FeatureCollection',
      features: results.flat(),
      tiles: tiles.map((tile) => tile.id),
    };
  };

  const clearCaches = () => {
    tileLoader.clear();
    contourCache.clear();
  };

  return {
    getElevation,
    getContoursForBounds,
    getTileContours,
    clearCaches,
    manifest,
  };
}

export function createBoundsFromLeaflet(mapBounds) {
  return normalizeBounds(mapBounds);
}
