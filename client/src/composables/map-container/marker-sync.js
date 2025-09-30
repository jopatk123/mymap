import L from 'leaflet';
import { createPopupContent } from '@/composables/kml-point-renderer.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';

/**
 * 负责地图标记的刷新、点击逻辑与 KML 处理。
 * 将与全局 window 交互的逻辑集中，方便测测试与未来替换。
 *
 * @param {Object} options
 * @param {Object} options.props - 组合式函数 props
 * @param {Function} options.emit - 组件 emit
 * @param {import('vue').Ref} options.map - 地图实例 ref
 * @param {Function} options.addPointMarkers - 添加点位方法
 * @param {Function} options.clearMarkers - 清除全部标记方法
 * @param {Function} options.clearPointMarkers - 清除点位标记方法
 * @param {Function} options.ensureMarkerRefreshModule - 异步加载 marker-refresh 模块的方法
 * @param {import('vue').Ref<Function>} options.onMarkerClick - 来自 useMap 的 marker 点击回调 ref
 * @param {Object} [deps]
 * @param {typeof L} [deps.leaflet]
 * @param {Window & typeof globalThis} [deps.window]
 * @param {(ms: number) => Promise<void>} [deps.delay]
 */
export function createMarkerSync(options, deps = {}) {
  const {
    props,
    emit,
    map,
    addPointMarkers,
    clearMarkers,
    clearPointMarkers,
    ensureMarkerRefreshModule,
    onMarkerClick,
  } = options;

  const leaflet = deps.leaflet || L;
  const windowRef = deps.window || (typeof window !== 'undefined' ? window : undefined);
  const delay = deps.delay || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  const getPointsSource = (override) => {
    if (Array.isArray(override) && override.length > 0) {
      return override;
    }

    if (windowRef && Array.isArray(windowRef.allPoints) && windowRef.allPoints.length > 0) {
      return windowRef.allPoints;
    }

    return props.panoramas || [];
  };

  const safeClearMarkers = () => {
    try {
      if (typeof clearPointMarkers === 'function') {
        clearPointMarkers();
        return;
      }
    } catch (error) {
      // fallthrough to legacy clearMarkers
    }
    clearMarkers();
  };

  const syncWithRefreshModule = async (points) => {
    try {
      const mod = await ensureMarkerRefreshModule();
      if (mod && typeof mod.setMarkersData === 'function') {
        mod.setMarkersData(points);
      }
    } catch (error) {
      // keep silent to avoid影响主流程
    }
  };

  const openPopupIfPossible = (point, popupContent) => {
    if (!leaflet || !map?.value) return;

    const lat = point.lat ?? point.latitude;
    const lng = point.lng ?? point.longitude;
    if (lat == null || lng == null) return;

    try {
      leaflet.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map.value);
    } catch (error) {
      // ignore popup failure
    }
  };

  const bindPopupToExistingMarker = (pointId, popupContent, originalPoint = null) => {
    if (!windowRef) return false;
    const currentMarkers = Array.isArray(windowRef.currentMarkers) ? windowRef.currentMarkers : [];
    const sameId = currentMarkers.filter((m) => m && m.id === pointId && m.marker);
    if (sameId.length === 0) return false;

    let preferred = sameId.find((m) => m.marker?.options?.pane !== 'kmlPane');
    if (!preferred)
      preferred = sameId.find(
        (m) => typeof m.marker?.getPopup === 'function' && m.marker.getPopup()
      );
    if (!preferred) preferred = sameId[0];
    if (!preferred?.marker) return false;

    try {
      preferred.marker.bindPopup(popupContent);
      if (typeof preferred.marker.openPopup === 'function') {
        preferred.marker.openPopup();
      }
      // 部分情况下 Leaflet 不会立即打开 popup，延迟校验
      setTimeout(() => {
        const popup = map.value && map.value._popup;
        if (!popup || (typeof popup.isOpen === 'function' && !popup.isOpen())) {
          const coords = getDisplayCoordinates(originalPoint || {});
          if (coords && coords.length === 2) {
            const [displayLng, displayLat] = coords;
            leaflet
              .popup()
              .setLatLng([displayLat, displayLng])
              .setContent(popupContent)
              .openOn(map.value);
          }
        }
      }, 30);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleKmlMarkerClick = (point) => {
    try {
      const wgsLat =
        point.latitude != null
          ? Number(point.latitude)
          : point.lat != null
          ? Number(point.lat)
          : null;
      const wgsLng =
        point.longitude != null
          ? Number(point.longitude)
          : point.lng != null
          ? Number(point.lng)
          : null;

      const feature = {
        type: 'Feature',
        properties: {
          name: point.title || point.name || '',
          description: point.description || '',
          ...(wgsLat != null && wgsLng != null ? { wgs84_lat: wgsLat, wgs84_lng: wgsLng } : {}),
        },
        geometry: { type: 'Point', coordinates: [wgsLng, wgsLat] },
      };

      const kmlFiles =
        (windowRef && Array.isArray(windowRef.allKmlFiles) && windowRef.allKmlFiles) || [];
      const kmlFile = kmlFiles.find(
        (f) => f.id === point.fileId || f.id === point.file_id || f.name === point.sourceFile
      ) || { title: '' };
      const popupContent = createPopupContent(feature, kmlFile);

      const bound = bindPopupToExistingMarker(point.id, popupContent, point);
      if (!bound) {
        openPopupIfPossible(point, popupContent);
      }
    } catch (error) {
      openPopupIfPossible(point, point?.description || point?.title || '');
    }
  };

  const handleMarkerClick = async (point) => {
    try {
      const isKml =
        !!point &&
        (String(point.id || '').includes('kml-') ||
          String(point.type || '').toLowerCase() === 'kml');
      if (isKml) {
        handleKmlMarkerClick(point);
        return;
      }
    } catch (error) {
      // fallback to emit event below
    }

    emit('panorama-click', point);
  };

  const refreshMarkers = async (options = {}) => {
    const { pointsOverride = null, delayMs = 50 } = options;
    if (delayMs > 0) {
      await delay(delayMs);
    }

    safeClearMarkers();

    const points = getPointsSource(pointsOverride);
    if (!Array.isArray(points) || points.length === 0) {
      return;
    }

    addPointMarkers(points);
    await syncWithRefreshModule(points);
  };

  const syncPanoramaMarkers = async (points) => {
    if (!Array.isArray(points) || points.length === 0) return;
    addPointMarkers(points);
    await syncWithRefreshModule(points);
  };

  const registerMarkerClick = () => {
    if (!onMarkerClick) return;
    onMarkerClick.value = handleMarkerClick;
    return handleMarkerClick;
  };

  return {
    refreshMarkers,
    syncPanoramaMarkers,
    registerMarkerClick,
    safeClearMarkers,
    getPointsSource,
  };
}
