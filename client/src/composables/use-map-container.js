import { computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useAppStore } from '@/store/app.js';
import { useMap } from '@/composables/use-map.js';
import {
  addStyleListener,
  removeStyleListener,
  addRefreshListener,
  removeRefreshListener,
} from '@/utils/style-events.js';
import { useSearchMarker } from '@/composables/use-search-marker.js';
import { useInitialViewSync } from '@/composables/use-initial-view-sync.js';
import { createMarkerSync } from './map-container/marker-sync.js';
import { registerExternalEvents } from './map-container/external-events.js';
import { setupMapContainerWatchers } from './map-container/map-watchers.js';
import { createGeolocationController } from './map-container/geolocation.js';
import { createPointerTracker } from './map-container/pointer-tracker.js';

const defaultGlobal = typeof window !== 'undefined' ? window : undefined;

/**
 * 拆分后的 Map 容器组合函数，聚合各子模块并提供统一接口。
 * @param {object} props
 * @param {(event: string, payload?: any) => void} emit
 * @param {object} [injected]
 */
export function useMapContainer(props, emit, injected = {}) {
  const useAppStoreImpl = injected.useAppStore || useAppStore;
  const useMapImpl = injected.useMap || useMap;
  const useSearchMarkerImpl = injected.useSearchMarker || useSearchMarker;
  const windowRef = injected.window || defaultGlobal;

  const appStore = useAppStoreImpl();
  const mapType = computed(() => appStore.mapSettings.mapType);

  let cleanupInitialViewSync;
  let cleanupExternalEvents = () => {};
  let cleanupWatchers = () => {};
  let mapClickHandler;
  let markerRefreshModule;

  const importMarkerRefresh =
    injected.importMarkerRefresh || (() => import('@/utils/marker-refresh.js'));

  const {
    map,
    isLoading,
    initMap,
    changeMapType,
    addPanoramaMarkers,
    addPointMarkers,
    addKmlLayers,
    clearMarkers,
    clearPointMarkers,
    clearKmlLayers,
    fitBounds,
    setCenter,
    onMarkerClick,
    markerClickDisabled,
  } = useMapImpl('map');

  const { setSearchMarker, clearSearchMarker } = useSearchMarkerImpl(map);

  const pointerTracker = createPointerTracker({
    map,
    elevationProvider: injected.elevationService,
    throttleMs: injected.pointerThrottleMs,
  });

  const panePointerCache = new Map();

  const setMarkerClickDisabled = (disabled) => {
    const shouldDisable = Boolean(disabled);
    if (markerClickDisabled) {
      markerClickDisabled.value = shouldDisable;
    }

    const mapInstance = map.value;
    if (!mapInstance || typeof mapInstance.getPane !== 'function') {
      return;
    }

    const paneNames = ['markerPane', 'videoPane', 'imageSetPane', 'panoramaPane', 'kmlPane'];
    for (const name of paneNames) {
      const pane = mapInstance.getPane(name);
      if (!pane) continue;
      if (!panePointerCache.has(name)) {
        panePointerCache.set(name, pane.style.pointerEvents || '');
      }
      pane.style.pointerEvents = shouldDisable ? 'none' : panePointerCache.get(name) || '';
    }

    let container = null;
    if (typeof mapInstance.getContainer === 'function') {
      container = mapInstance.getContainer();
    }
    if (container && container.classList) {
      container.classList.toggle('marker-click-disabled', shouldDisable);
    }
  };

  const ensureMarkerRefreshModule = async () => {
    if (!markerRefreshModule) {
      markerRefreshModule = await importMarkerRefresh();
    }
    return markerRefreshModule;
  };

  const markerSync = createMarkerSync(
    {
      props,
      emit,
      map,
      addPointMarkers,
      clearMarkers,
      clearPointMarkers,
      ensureMarkerRefreshModule,
      onMarkerClick,
    },
    {
      window: windowRef,
      delay: injected.delay,
      leaflet: injected.leaflet,
    }
  );

  const { locating, locateUser } = createGeolocationController({
    setCenter,
    ElMessage,
    navigatorRef: injected.navigator,
  });

  const handleMapTypeChange = (type) => {
    if (mapType.value === type) return;
    appStore.updateMapSettings({ mapType: type });
  };

  const fitAllMarkers = () => {
    fitBounds();
  };

  const setupMarkerRefreshBridge = async () => {
    try {
      const mapInstance = await initMap(
        {
          center: props.center,
          zoom: props.zoom,
        },
        mapType.value
      );

      if (!mapInstance) return;

      const mod = await ensureMarkerRefreshModule();
      mod.setMapInstance({
        clearMarkers: typeof clearPointMarkers === 'function' ? clearPointMarkers : clearMarkers,
        addPointMarkers,
      });

      await markerSync.refreshMarkers();

      mapClickHandler = (e) => {
        emit('map-click', e.latlng);
      };
      mapInstance.on('click', mapClickHandler);

      pointerTracker.attach();
      // 确保地图加载完成后应用当前交互状态
      setMarkerClickDisabled(markerClickDisabled?.value);
    } catch (error) {
      // 地图初始化失败则不继续执行后续逻辑
    }
  };

  onMounted(async () => {
    await setupMarkerRefreshBridge();
    markerSync.registerMarkerClick();

    // 监听全局清除搜索标记事件（由其它模块触发，例如区域清除时）
    try {
      if (windowRef && typeof windowRef.addEventListener === 'function') {
        windowRef.addEventListener('clear-search-marker', () => {
          try {
            if (typeof clearSearchMarker === 'function') clearSearchMarker();
          } catch (err) {
            // ignore
          }
        });
      }
    } catch (err) {
      // ignore
    }

    cleanupExternalEvents = registerExternalEvents({
      addStyleListener,
      removeStyleListener,
      addRefreshListener,
      removeRefreshListener,
      onStyleUpdate: () => {},
      onMarkersRefresh: () => {
        markerSync.refreshMarkers();
      },
    });

    cleanupWatchers = setupMapContainerWatchers({
      props,
      map,
      mapType,
      changeMapType,
      setCenter,
      syncPanoramaMarkers: markerSync.syncPanoramaMarkers,
      safeClearMarkers: markerSync.safeClearMarkers,
      windowRef,
    });

    const { setup } = useInitialViewSync(setCenter);
    cleanupInitialViewSync = setup();
  });

  onUnmounted(() => {
    cleanupExternalEvents();
    cleanupWatchers();
    pointerTracker.detach();
    if (cleanupInitialViewSync) {
      try {
        cleanupInitialViewSync();
      } catch (error) {
        // ignore cleanup failure
      }
    }

    if (map.value && mapClickHandler) {
      map.value.off('click', mapClickHandler);
    }
    try {
      if (windowRef && typeof windowRef.removeEventListener === 'function') {
        windowRef.removeEventListener('clear-search-marker', () => {});
      }
    } catch (err) {
      // ignore
    }
  });

  return {
    mapType,
    isLoading,
    handleMapTypeChange,
    locateUser,
    fitAllMarkers,
    setSearchMarker,
    clearSearchMarker,
    addPanoramaMarkers,
    addPointMarkers,
    addKmlLayers,
    clearMarkers,
    clearKmlLayers,
    map,
    setCenter,
    fitBounds,
    locating,
    pointerState: pointerTracker.state,
    setMarkerClickDisabled,
    expose: {
      setCenter,
      fitBounds,
      addPanoramaMarkers,
      addPointMarkers,
      addKmlLayers,
      clearMarkers,
      clearKmlLayers,
      setSearchMarker,
      clearSearchMarker,
      map,
      pointerState: pointerTracker.state,
      _locateUser: locateUser,
      _fitAllMarkers: fitAllMarkers,
      setMarkerClickDisabled,
    },
  };
}
