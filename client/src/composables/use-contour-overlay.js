import { ref, watch } from 'vue';
import L from 'leaflet';
import { elevationService } from '@/services/elevation/index.js';

const defaultStyle = {
  color: '#ff6d00',
  weight: 1,
  opacity: 0.7,
  dashArray: '4,2',
  pane: 'contourPane',
};

export function useContourOverlay(mapRef, options = {}) {
  const { service = elevationService, message } = options;

  const visible = ref(false);
  const loading = ref(false);
  const error = ref(null);
  const layerRef = ref(null);
  const cachedFeatures = ref(null);
  const activeTileIds = ref([]);
  let moveEndHandler = null;

  const detachMoveHandler = (map) => {
    if (map && moveEndHandler) {
      map.off('moveend', moveEndHandler);
      moveEndHandler = null;
    }
  };

  const removeLayer = (map) => {
    if (map && layerRef.value) {
      try {
        map.removeLayer(layerRef.value);
      } catch (err) {
        void console.warn('Failed to remove contour layer', err);
      }
    }
    layerRef.value = null;
  };

  const clearOverlay = (map) => {
    removeLayer(map);
    detachMoveHandler(map);
    visible.value = false;
  };

  const renderLayer = (map, featureCollection) => {
    if (!map) return;
    removeLayer(map);
    layerRef.value = L.geoJSON(featureCollection, {
      style: defaultStyle,
      interactive: false,
    });
    layerRef.value.addTo(map);
  };

  const updateFromBounds = async (map, { skipTileCheck = false } = {}) => {
    if (!map) return false;
    const result = await service.getContoursForBounds(map.getBounds?.(), options.overrides);
    const tileIds = Array.isArray(result.tiles) ? result.tiles : [];
    const sameTiles =
      !skipTileCheck &&
      tileIds.length === activeTileIds.value.length &&
      tileIds.every((id) => activeTileIds.value.includes(id));

    if (sameTiles) {
      return false;
    }

    if (!result.features?.length) {
      cachedFeatures.value = null;
      activeTileIds.value = [];
      clearOverlay(map);
      if (skipTileCheck && message?.warning) {
        message.warning('当前范围无可用等高线数据');
      }
      return false;
    }

    cachedFeatures.value = result;
    activeTileIds.value = [...tileIds];
    renderLayer(map, result);
    visible.value = true;
    return true;
  };

  const attachMoveHandler = (map) => {
    if (!map || moveEndHandler) return;
    moveEndHandler = async () => {
      if (!visible.value || loading.value) return;
      try {
        await updateFromBounds(map);
      } catch (moveError) {
        error.value = moveError;
      }
    };
    map.on('moveend', moveEndHandler);
  };

  const ensureLayer = async () => {
    const map = mapRef?.value;
    if (!map) return;
    loading.value = true;
    error.value = null;
    try {
      const updated = await updateFromBounds(map, { skipTileCheck: true });
      if (!updated && !cachedFeatures.value) {
        return;
      }
      attachMoveHandler(map);
    } catch (err) {
      error.value = err;
      clearOverlay(map);
      if (message?.error) {
        message.error('等高线生成失败，请稍后重试');
      }
    } finally {
      loading.value = false;
    }
  };

  const toggleContours = async () => {
    const map = mapRef?.value;
    if (!map) return;
    if (visible.value) {
      clearOverlay(map);
      return;
    }
    if (cachedFeatures.value) {
      renderLayer(map, cachedFeatures.value);
      visible.value = true;
      attachMoveHandler(map);
      return;
    }
    await ensureLayer();
  };

  watch(
    () => mapRef?.value,
    (map, previous) => {
      if (previous && previous !== map) {
        detachMoveHandler(previous);
        removeLayer(previous);
      }
      if (map && visible.value && cachedFeatures.value) {
        renderLayer(map, cachedFeatures.value);
        attachMoveHandler(map);
      }
    }
  );

  const disposeContours = () => {
    const map = mapRef?.value;
    clearOverlay(map);
    cachedFeatures.value = null;
    activeTileIds.value = [];
  };

  return {
    contoursVisible: visible,
    contoursLoading: loading,
    contourError: error,
    toggleContours,
    refreshContours: ensureLayer,
    disposeContours,
  };
}
