import { ref, watch } from 'vue';
import L from 'leaflet';
import { elevationService } from '@/services/elevation/index.js';
import { usePolygonDrawer } from './use-polygon-drawer.js';

const defaultStyle = {
  color: '#ff6d00',
  weight: 1.5,
  opacity: 0.8,
  dashArray: '5, 5', // 虚线：5px 实线，5px 空白
  lineCap: 'round',
  lineJoin: 'round', // 圆角连接，更平滑
  pane: 'contourPane',
};

const normalizeLatLng = (value) => {
  if (!value) return null;
  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  if (Array.isArray(value) && value.length >= 2) {
    return { lat: Number(value[0]), lng: Number(value[1]) };
  }
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { lat: value.latitude, lng: value.longitude };
  }
  return null;
};

const dedupePolygon = (points) => {
  if (!points.length) return points;
  const result = [...points];
  const first = result[0];
  const last = result[result.length - 1];
  if (first.lat === last.lat && first.lng === last.lng) {
    result.pop();
  }
  return result;
};

const pointInPolygon = (point, polygon) => {
  if (!polygon.length) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const clipLineByPolygon = (lineString, polygonPoints, bounds) => {
  if (!lineString?.length) return null;
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const segments = [];
  let currentSegment = [];

  for (const [lng, lat] of lineString) {
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }

    const inside = pointInPolygon({ lat, lng }, polygonPoints);
    if (inside) {
      currentSegment.push([lng, lat]);
    } else {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return segments.length ? segments : null;
};

export function useContourOverlay(mapRef, options = {}) {
  const { service = elevationService, message, onRequestInterval } = options;

  const visible = ref(false);
  const loading = ref(false);
  const error = ref(null);
  const layerRef = ref(null);
  const labelsLayerRef = ref(null); // 用于高程标签
  const cachedFeatures = ref(null);
  const activeTileIds = ref([]);
  const drawRegion = ref(null); // 用户绘制的区域
  const contourInterval = ref(50); // 等高线间距，默认 50 米

  // 初始化区域绘制工具
  const polygonDrawer = usePolygonDrawer(mapRef, {
    message,
    onComplete: async (result) => {
      drawRegion.value = result;
      await generateContoursForRegion(result);
    },
  });

  const removeLayer = (map) => {
    if (map && layerRef.value) {
      try {
        map.removeLayer(layerRef.value);
      } catch (_error) {
        // ignore remove errors
      }
    }
    layerRef.value = null;

    // 移除标签图层
    if (map && labelsLayerRef.value) {
      try {
        map.removeLayer(labelsLayerRef.value);
      } catch (_error) {
        // ignore remove errors
      }
    }
    labelsLayerRef.value = null;
  };

  const clearOverlay = (map) => {
    removeLayer(map);
    visible.value = false;
  };

  // 创建等高线标签
  const createContourLabels = (map, features) => {
    if (!map || !features || features.length === 0) return;

    const labels = [];

    features.forEach((feature) => {
      const elevation = feature.properties?.elevation;
      if (elevation === undefined || elevation === null) return;

      // 从每个等高线的中间位置提取一个点作为标签位置
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) return;

      // 选择第一条线段的中间点
      const firstLine = coordinates[0];
      if (!firstLine || firstLine.length < 2) return;

      const midIndex = Math.floor(firstLine.length / 2);
      const [lng, lat] = firstLine[midIndex];

      // 创建标签
      const labelIcon = L.divIcon({
        className: 'contour-label',
        html: `<div class="contour-label-text">${Math.round(elevation)}</div>`,
        iconSize: [50, 20],
        iconAnchor: [25, 10],
      });

      const marker = L.marker([lat, lng], {
        icon: labelIcon,
        interactive: false,
        pane: 'contourPane',
      });

      labels.push(marker);
    });

    // 创建图层组
    if (labels.length > 0) {
      labelsLayerRef.value = L.layerGroup(labels);
      labelsLayerRef.value.addTo(map);
    }
  };

  const clipFeatureToPolygon = (feature, polygonLatLngs) => {
    if (!feature?.geometry || !polygonLatLngs?.length) {
      return feature;
    }

    const polygonPoints = dedupePolygon(
      polygonLatLngs
        .map(normalizeLatLng)
        .filter((point) => point && !Number.isNaN(point.lat) && !Number.isNaN(point.lng))
    );

    if (polygonPoints.length < 3) {
      return null;
    }

    const boundsLatLng = L.latLngBounds(polygonPoints.map(({ lat, lng }) => L.latLng(lat, lng)));
    const bounds = {
      minLat: boundsLatLng.getSouth(),
      maxLat: boundsLatLng.getNorth(),
      minLng: boundsLatLng.getWest(),
      maxLng: boundsLatLng.getEast(),
    };

    if (feature.geometry.type === 'MultiLineString') {
      const clippedCoordinates = [];

      for (const lineString of feature.geometry.coordinates) {
        const segments = clipLineByPolygon(lineString, polygonPoints, bounds);
        if (segments) {
          clippedCoordinates.push(...segments);
        }
      }

      if (!clippedCoordinates.length) {
        return null;
      }

      return {
        ...feature,
        geometry: {
          type: 'MultiLineString',
          coordinates: clippedCoordinates,
        },
      };
    }

    return feature;
  };

  const renderLayer = (map, featureCollection, clipPolygon = null) => {
    if (!map) return false;
    removeLayer(map);

    let features = featureCollection.features || [];
    // eslint-disable-next-line no-console
    console.log('[renderLayer] 输入特征数量:', features.length);
    // eslint-disable-next-line no-console
    console.log('[renderLayer] 是否需要裁剪:', !!clipPolygon);

    // 如果有裁剪多边形，进行裁剪
    if (clipPolygon) {
      // eslint-disable-next-line no-console
      console.log('[renderLayer] 裁剪多边形点数:', clipPolygon.length);
      // eslint-disable-next-line no-console
      console.log('[renderLayer] 裁剪多边形样本:', clipPolygon.slice(0, 2));

      const beforeClip = features.length;
      features = features
        .map((feature) => clipFeatureToPolygon(feature, clipPolygon))
        .filter(Boolean);
      // eslint-disable-next-line no-console
      console.log('[renderLayer] 裁剪: 输入', beforeClip, '条，输出', features.length, '条');
    }

    if (features.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[renderLayer] 裁剪后没有特征需要渲染');
      return false;
    }

    const clippedCollection = {
      type: 'FeatureCollection',
      features,
    };

    layerRef.value = L.geoJSON(clippedCollection, {
      style: defaultStyle,
      interactive: false,
    });

    layerRef.value.addTo(map);

    // 添加高程标签
    createContourLabels(map, features);

    // eslint-disable-next-line no-console
    console.log('[renderLayer] 已添加', features.length, '个等高线特征到地图');

    return true;
  };

  const generateContoursForRegion = async (region) => {
    const map = mapRef?.value;
    if (!map || !region) return;

    loading.value = true;
    error.value = null;

    try {
      // eslint-disable-next-line no-console
      console.log('[Contour] 开始生成等高线，区域:', {
        bounds: {
          south: region.bounds.getSouth?.() ?? region.bounds.minLat,
          north: region.bounds.getNorth?.() ?? region.bounds.maxLat,
          west: region.bounds.getWest?.() ?? region.bounds.minLng,
          east: region.bounds.getEast?.() ?? region.bounds.maxLng,
        },
        points: region.latLngs?.length,
        interval: contourInterval.value,
      });

      // 使用用户设置的间距
      const result = await service.getContoursForBounds(region.bounds, {
        thresholdStep: contourInterval.value,
        sampleSize: 512,
        maxContours: 100, // 增加最大数量
      });

      if (!result.features?.length) {
        // eslint-disable-next-line no-console
        console.warn('[Contour] 所选区域内没有高程数据');
        if (message?.warning) {
          message.warning('所选区域内没有高程数据');
        }
        drawRegion.value = null;
        return;
      }

      const uniqueElevations = new Set(
        result.features
          .map((feature) => feature?.properties?.elevation)
          .filter((value) => typeof value === 'number' && !Number.isNaN(value))
      );
      const uniqueSpacings = new Set(
        result.features
          .map((feature) => feature?.properties?.spacing)
          .filter((value) => typeof value === 'number' && !Number.isNaN(value))
      );
      const spacingValue = uniqueSpacings.size === 1 ? uniqueSpacings.values().next().value : null;

      // eslint-disable-next-line no-console
      console.log('[Contour] 生成完成:', {
        features: result.features.length,
        elevations: uniqueElevations.size,
        range: [Math.min(...uniqueElevations), Math.max(...uniqueElevations)],
        spacing: spacingValue,
        tiles: result.tiles,
      });

      cachedFeatures.value = result;
      activeTileIds.value = result.tiles || [];

      // 渲染时裁剪到绘制的多边形区域
      visible.value = renderLayer(map, result, region.latLngs);

      if (message?.success) {
        const contourCount = uniqueElevations.size || result.features.length;
        const spacingSuffix = spacingValue ? `，间距约 ${spacingValue} 米` : '';
        message.success(`成功生成 ${contourCount} 条等高线${spacingSuffix}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Contour] 等高线生成错误:', err);
      error.value = err;
      if (message?.error) {
        message.error('等高线生成失败，请稍后重试');
      }
      drawRegion.value = null;
    } finally {
      loading.value = false;
    }
  };

  const toggleContours = async () => {
    const map = mapRef?.value;
    if (!map) return;

    // 如果已经显示，则隐藏并清理
    if (visible.value) {
      clearOverlay(map);
      polygonDrawer.reset();
      drawRegion.value = null;
      cachedFeatures.value = null;
      activeTileIds.value = [];
      return;
    }

    // 如果有缓存的等高线，直接显示
    if (cachedFeatures.value && drawRegion.value) {
      visible.value = renderLayer(map, cachedFeatures.value, drawRegion.value.latLngs);
      return;
    }

    // 弹窗输入等高线间距
    const promptInterval = () => {
      return new Promise((resolve) => {
        // 如果提供了外部对话框回调，使用它
        if (onRequestInterval) {
          onRequestInterval((value) => {
            if (value !== null && value !== undefined) {
              resolve(value);
            } else {
              resolve(null);
            }
          });
          return;
        }

        // 否则使用原生 prompt
        const input = window.prompt('请输入等高线间距（米）：', contourInterval.value);
        if (input === null) {
          resolve(null);
          return;
        }
        const value = Number(input);
        if (Number.isNaN(value) || value <= 0) {
          if (message?.warning) {
            message.warning('请输入有效的间距值');
          }
          resolve(null);
          return;
        }
        resolve(value);
      });
    };

    const interval = await promptInterval();
    if (interval === null) {
      // 用户取消了输入
      return;
    }

    // 更新间距
    contourInterval.value = interval;

    // 开始绘制模式
    polygonDrawer.startDrawing();
  };

  watch(
    () => mapRef?.value,
    (map, previous) => {
      if (previous && previous !== map) {
        removeLayer(previous);
        polygonDrawer.stopDrawing();
      }
      if (map && visible.value && cachedFeatures.value && drawRegion.value) {
        visible.value = renderLayer(map, cachedFeatures.value, drawRegion.value.latLngs);
      }
    }
  );

  const disposeContours = () => {
    const map = mapRef?.value;
    clearOverlay(map);
    polygonDrawer.reset();
    cachedFeatures.value = null;
    activeTileIds.value = [];
    drawRegion.value = null;
  };

  return {
    contoursVisible: visible,
    contoursLoading: loading,
    contourError: error,
    isDrawing: polygonDrawer.isDrawing,
    toggleContours,
    disposeContours,
  };
}
