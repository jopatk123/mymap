import { watch } from 'vue';

/**
 * 统一注册 useMapContainer 内部的响应式监听，返回注销函数集合。
 * 将 watch 逻辑集中，避免在主组合函数中分散定义。
 */
export function setupMapContainerWatchers(options) {
  const {
    props,
    map,
    mapType,
    changeMapType,
    setCenter,
    syncPanoramaMarkers,
    safeClearMarkers,
    windowRef = typeof window !== 'undefined' ? window : undefined,
  } = options;

  const stops = [];

  const register = (stopHandle) => {
    if (typeof stopHandle === 'function') {
      stops.push(stopHandle);
    }
  };

  register(
    watch(
      () => props.panoramas,
      async (newPanoramas) => {
        safeClearMarkers();
        const globalPoints =
          windowRef && Array.isArray(windowRef.allPoints) && windowRef.allPoints.length > 0
            ? windowRef.allPoints
            : undefined;
        const source =
          globalPoints ||
          (Array.isArray(newPanoramas) && newPanoramas.length > 0 ? newPanoramas : []);
        if (source.length > 0) {
          await syncPanoramaMarkers(source);
        }
      },
      { immediate: true }
    )
  );

  register(
    watch(
      () => (windowRef ? windowRef.allPoints : undefined),
      async (newPoints) => {
        if (!Array.isArray(newPoints) || newPoints.length === 0) return;
        safeClearMarkers();
        await syncPanoramaMarkers(newPoints);
      },
      { deep: true }
    )
  );

  register(
    watch(mapType, (newType, oldType) => {
      if (newType !== oldType) {
        changeMapType(newType);
      }
    })
  );

  register(
    watch(
      () => props.center,
      (newCenter) => {
        if (!map?.value) return;
        if (!Array.isArray(newCenter) || newCenter.length !== 2) return;
        const [lat, lng] = newCenter;
        if (lat == null || lng == null) return;
        setCenter(lat, lng, props.zoom);
      },
      { immediate: true }
    )
  );

  register(
    watch(
      () => props.zoom,
      (newZoom) => {
        if (!map?.value) return;
        if (typeof newZoom !== 'number') return;
        const [lat, lng] = Array.isArray(props.center) ? props.center : [null, null];
        if (lat == null || lng == null) return;
        setCenter(lat, lng, newZoom);
      }
    )
  );

  return () => {
    while (stops.length) {
      const stop = stops.pop();
      try {
        stop();
      } catch (error) {
        // ignore individual cleanup errors
      }
    }
  };
}
