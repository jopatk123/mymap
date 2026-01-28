// 拆分重构：聚合管理与视口裁剪逻辑已分离到 mapMarkers 子模块
import L from 'leaflet';
import { useAppStore } from '@/store/app.js';
import 'leaflet.markercluster';
import { createPointMarker } from '@/utils/map-utils.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';
import { createClusterManager } from './mapMarkers/cluster-manager.js';
import { createViewportClipping } from './mapMarkers/viewport-clipping.js';
import { createMarkerHandlers } from './mapMarkers/marker-handlers.js';

export function useMapMarkers(map, markers, onMarkerClick, markerClickDisabled) {
  // Threshold that triggers viewport-clipping mode. Increase for temporary testing to bypass clipping.
  const VIEWPORT_THRESHOLD = 100000; // original: 1200
  const clusterManager = createClusterManager(map);
  const {
    state: viewportState,
    enable: enableViewportClipping,
    disable: disableViewportClipping,
    scheduleViewportUpdate,
    removeMarkersBatch: vpRemoveMarkersBatch,
  } = createViewportClipping(map, clusterManager, markers, onMarkerClick, markerClickDisabled);
  void vpRemoveMarkersBatch;

  const getPaneNameByType = (type) => {
    switch (type) {
      case 'video':
        return 'videoPane';
      case 'image-set':
        return 'imageSetPane';
      case 'kml':
        return 'kmlPane';
      case 'panorama':
      default:
        return 'panoramaPane';
    }
  };

  const ensureClusterGroup = (type) => clusterManager.ensureClusterGroup(type);
  const ensureZoomGuards = () => clusterManager.ensureZoomGuards();

  const getPointType = (point) => point?.type || 'panorama';

  const getMarkerTitle = (point, pointType) =>
    point.title ||
    (pointType === 'video' ? '视频点位' : pointType === 'image-set' ? '图片集' : '全景图');

  const getTypeStyles = (pointType) => {
    switch (pointType) {
      case 'video':
        return window.videoPointStyles || {};
      case 'image-set':
        return window.imageSetPointStyles || {};
      case 'panorama':
      default:
        return window.panoramaPointStyles || {};
    }
  };

  const {
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
  } = createMarkerHandlers({
    L,
    map,
    markers,
    onMarkerClick,
    markerClickDisabled,
    viewportState,
    enableViewportClipping,
    scheduleViewportUpdate,
    ensureClusterGroup,
    ensureZoomGuards,
    getPaneNameByType,
    getPointType,
    getMarkerTitle,
    getTypeStyles,
    createPointMarker,
    getDisplayCoordinates,
    viewportThreshold: VIEWPORT_THRESHOLD,
  });

  const removeMarker = (id) => {
    const markerIndex = markers.value.findIndex((m) => m.id === id);
    if (markerIndex > -1) {
      const { marker, type } = markers.value[markerIndex];

      try {
        const styles =
          type === 'video'
            ? window.videoPointStyles || {}
            : type === 'image-set'
            ? window.imageSetPointStyles || {}
            : window.panoramaPointStyles || {};
        const useCluster = Boolean(styles.cluster_enabled);

        if (useCluster) {
          const group =
            type === 'video'
              ? clusterManager.videoClusterGroup
              : type === 'image-set'
              ? clusterManager.imageSetClusterGroup
              : clusterManager.panoramaClusterGroup;
          if (group && group.hasLayer(marker)) {
            group.removeLayer(marker);
          }
        } else if (marker && map.value && marker._map) {
          map.value.removeLayer(marker);
        }
      } catch (error) {}

      markers.value.splice(markerIndex, 1);
      viewportState.idToMarker.delete(id);

      if (window.currentMarkers) {
        window.currentMarkers = window.currentMarkers.filter((m) => m.id !== id);
      }
    }
  };

  const removeMarkersBatch = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const videoToRemove = [];
    const panoToRemove = [];
    const imageSetToRemove = [];
    const normalToRemove = [];
    for (const id of ids) {
      const info = viewportState.idToMarker.get(id);
      if (!info) continue;
      const { marker, type } = info;
      const styles =
        type === 'video'
          ? window.videoPointStyles || {}
          : type === 'image-set'
          ? window.imageSetPointStyles || {}
          : window.panoramaPointStyles || {};
      const useCluster = Boolean(styles.cluster_enabled);
      if (useCluster) {
        if (type === 'video') videoToRemove.push(marker);
        else if (type === 'image-set') imageSetToRemove.push(marker);
        else panoToRemove.push(marker);
      } else {
        normalToRemove.push(marker);
      }
      viewportState.idToMarker.delete(id);
      const idx = markers.value.findIndex((m) => m.id === id);
      if (idx > -1) markers.value.splice(idx, 1);
      if (window.currentMarkers) {
        window.currentMarkers = window.currentMarkers.filter((m) => m.id !== id);
      }
    }
    try {
      if (videoToRemove.length && clusterManager.videoClusterGroup)
        clusterManager.videoClusterGroup.removeLayers(videoToRemove);
      if (panoToRemove.length && clusterManager.panoramaClusterGroup)
        clusterManager.panoramaClusterGroup.removeLayers(panoToRemove);
      if (imageSetToRemove.length && clusterManager.imageSetClusterGroup)
        clusterManager.imageSetClusterGroup.removeLayers(imageSetToRemove);
      if (normalToRemove.length) {
        for (const m of normalToRemove) {
          try {
            if (m && m._map && map.value) map.value.removeLayer(m);
          } catch {}
        }
      }
    } catch (e) {
      for (const id of ids) removeMarker(id);
    }
  };

  void removeMarkersBatch;

  const clearMarkers = () => {
    try {
      if (viewportState.enabled) {
        disableViewportClipping();
      }
      clusterManager.clearAll();

      markers.value.forEach(({ marker }) => {
        try {
          if (marker && map.value && marker._map) {
            map.value.removeLayer(marker);
          }
        } catch (error) {}
      });

      markers.value = [];

      window.currentMarkers = [];

      try {
        viewportState.idToMarker.clear();
      } catch {}
      try {
        viewportState.coordCache.clear();
      } catch {}
      try {
        viewportState.renderedIds && viewportState.renderedIds.clear();
      } catch {}
    } catch (error) {
      void console.warn('清除标记时出错:', error);
      markers.value = [];
      window.currentMarkers = [];
      try {
        viewportState.idToMarker.clear();
      } catch {}
      try {
        viewportState.coordCache.clear();
      } catch {}
      try {
        viewportState.renderedIds && viewportState.renderedIds.clear();
      } catch {}
    }
  };

  const fitBounds = () => {
    if (!map.value) return;
    try {
      const appStore = useAppStore();
      if (appStore?.initialViewSettings?.enabled) return;
    } catch (e) {}

    try {
      const validMarkers = markers.value.filter(
        (m) => m.marker && m.marker._map && typeof m.marker.getLatLng === 'function'
      );
      if (validMarkers.length === 0) {
        let bounds = null;
        if (
          clusterManager.videoClusterGroup &&
          map.value.hasLayer(clusterManager.videoClusterGroup) &&
          typeof clusterManager.videoClusterGroup.getBounds === 'function'
        ) {
          const b = clusterManager.videoClusterGroup.getBounds();
          if (b && b.isValid && b.isValid()) bounds = bounds ? bounds.extend(b) : b;
        }
        if (
          clusterManager.panoramaClusterGroup &&
          map.value.hasLayer(clusterManager.panoramaClusterGroup) &&
          typeof clusterManager.panoramaClusterGroup.getBounds === 'function'
        ) {
          const b = clusterManager.panoramaClusterGroup.getBounds();
          if (b && b.isValid && b.isValid()) bounds = bounds ? bounds.extend(b) : b;
        }
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.value.fitBounds(bounds, { padding: [20, 20] });
        }
        return;
      }

      const group = new L.featureGroup(validMarkers.map((m) => m.marker));
      const bounds = group.getBounds();

      if (bounds.isValid()) {
        map.value.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (error) {
      void console.warn('fitBounds failed:', error);
    }
  };

  return {
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
    removeMarker,
    clearMarkers,
    fitBounds,
  };
}
