import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { useAppStore } from '@/store/app.js';
import { useMap } from '@/composables/use-map.js';
import { createPopupContent } from '@/composables/kml-point-renderer.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';
import {
  addStyleListener,
  removeStyleListener,
  addRefreshListener,
  removeRefreshListener,
} from '@/utils/style-events.js';
import { useSearchMarker } from '@/composables/use-search-marker.js';
import { useInitialViewSync } from '@/composables/use-initial-view-sync.js';

/**
 * 拆分 MapContainer.vue 的核心逻辑，集中处理地图初始化、事件绑定与外部交互。
 * @param {object} props - 组件 props（期望包含 panoramas/center/zoom）
 * @param {(event: string, payload?: any) => void} emit - 组件 emit
 */
export function useMapContainer(props, emit) {
  const appStore = useAppStore();
  const mapType = computed(() => appStore.mapSettings.mapType);
  const locating = ref(false);

  let cleanupInitialViewSync;
  let markerRefreshModule;
  let mapClickHandler;

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
  } = useMap('map');

  const { setSearchMarker, clearSearchMarker } = useSearchMarker(map);

  const ensureMarkerRefreshModule = async () => {
    if (!markerRefreshModule) {
      markerRefreshModule = await import('@/utils/marker-refresh.js');
    }
    return markerRefreshModule;
  };

  const handleStyleUpdate = () => {
    // 样式已经在全局变量中更新，这里无需额外处理
  };

  const handleMarkersRefresh = () => {
    setTimeout(async () => {
      try {
        if (typeof clearPointMarkers === 'function') {
          clearPointMarkers();
        } else {
          clearMarkers();
        }
      } catch (error) {
        clearMarkers();
      }

      const points = (typeof window !== 'undefined' && window.allPoints) || props.panoramas;
      if (!points || points.length === 0) return;

      addPointMarkers(points);
      try {
        const mod = await ensureMarkerRefreshModule();
        mod.setMarkersData(points);
      } catch (error) {
        // ignore marker refresh failures
      }
    }, 50);
  };

  const setupMarkerClickHandling = () => {
    const handleMarkerClick = async (point) => {
      try {
        const isKml =
          !!point &&
          (String(point.id || '').includes('kml-') ||
            String(point.type || '').toLowerCase() === 'kml');
        if (isKml) {
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
          const kmlFiles = (typeof window !== 'undefined' && window.allKmlFiles) || [];
          const kmlFile = kmlFiles.find(
            (f) => f.id === point.fileId || f.id === point.file_id || f.name === point.sourceFile
          ) || { title: '' };
          const popupContent = createPopupContent(feature, kmlFile);
          const currentMarkers = (typeof window !== 'undefined' && window.currentMarkers) || [];
          const sameId = currentMarkers.filter((m) => m && m.id === point.id && m.marker);
          let preferred = sameId.find((m) => m.marker?.options?.pane !== 'kmlPane');
          if (!preferred)
            preferred = sameId.find(
              (m) => typeof m.marker.getPopup === 'function' && m.marker.getPopup()
            );
          if (!preferred) preferred = sameId[0];

          if (preferred && preferred.marker) {
            try {
              preferred.marker.bindPopup(popupContent);
              if (typeof preferred.marker.openPopup === 'function') {
                preferred.marker.openPopup();
              }
              setTimeout(() => {
                const opened = !!(
                  map.value &&
                  map.value._popup &&
                  map.value._popup.isOpen &&
                  map.value._popup.isOpen()
                );
                if (!opened) {
                  const coords = getDisplayCoordinates(point);
                  if (coords && coords.length === 2) {
                    const [displayLng, displayLat] = coords;
                    L.popup()
                      .setLatLng([displayLat, displayLng])
                      .setContent(popupContent)
                      .openOn(map.value);
                  }
                }
              }, 30);
              return;
            } catch (error) {
              // 兜底逻辑在下方执行
            }
          }

          const lat = point.lat ?? point.latitude;
          const lng = point.lng ?? point.longitude;
          if (map.value && lat != null && lng != null) {
            L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map.value);
          }
          return;
        }
      } catch (error) {
        // 忽略 KML 处理异常，继续默认逻辑
      }

      emit('panorama-click', point);
    };

    onMarkerClick.value = handleMarkerClick;
  };

  const setupInitialViewSync = () => {
    const { setup } = useInitialViewSync(setCenter);
    cleanupInitialViewSync = setup();
  };

  const setupExternalEventListeners = () => {
    addStyleListener(handleStyleUpdate);
    addRefreshListener(handleMarkersRefresh);
  };

  const cleanupExternalEventListeners = () => {
    removeStyleListener(handleStyleUpdate);
    removeRefreshListener(handleMarkersRefresh);
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

      // 地图初始化完成后尝试刷新一次点位，防止初始数据因地图未就绪而未渲染
      handleMarkersRefresh();

      mapClickHandler = (e) => {
        emit('map-click', e.latlng);
      };
      mapInstance.on('click', mapClickHandler);
    } catch (error) {
      // 地图初始化失败将阻断后续逻辑
    }
  };

  const locateUser = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      ElMessage.warning('浏览器不支持地理定位');
      return;
    }

    locating.value = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenter(latitude, longitude, 16);
        locating.value = false;
        ElMessage.success('定位成功');
      },
      () => {
        locating.value = false;
        ElMessage.error('定位失败，请检查位置权限');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const fitAllMarkers = () => {
    fitBounds();
  };

  const handleMapTypeChange = (type) => {
    if (mapType.value === type) return;
    appStore.updateMapSettings({ mapType: type });
  };

  const syncPanoramaMarkers = async (pointsToShow) => {
    if (!pointsToShow || pointsToShow.length === 0) return;

    const mod = await ensureMarkerRefreshModule();
    mod.setMarkersData(pointsToShow);
    addPointMarkers(pointsToShow);
  };

  const watchPanoramaProps = () => {
    watch(
      () => props.panoramas,
      async (newPanoramas) => {
        try {
          if (typeof clearPointMarkers === 'function') {
            clearPointMarkers();
          }
        } catch (error) {
          clearMarkers();
        }

        const pointsToShow =
          typeof window !== 'undefined' && window.allPoints && window.allPoints.length > 0
            ? window.allPoints
            : newPanoramas;

        if (!pointsToShow || pointsToShow.length === 0) return;
        await syncPanoramaMarkers(pointsToShow);
      },
      { immediate: true }
    );
  };

  const watchGlobalPoints = () => {
    watch(
      () => (typeof window !== 'undefined' ? window.allPoints : undefined),
      async (newPoints) => {
        if (!newPoints || newPoints.length === 0) return;
        try {
          if (typeof clearPointMarkers === 'function') {
            clearPointMarkers();
          }
        } catch (error) {
          clearMarkers();
        }
        await syncPanoramaMarkers(newPoints);
      },
      { deep: true }
    );
  };

  const watchMapType = () => {
    watch(mapType, (newType) => {
      changeMapType(newType);
    });
  };

  const watchCenterAndZoom = () => {
    watch(
      () => props.center,
      (newCenter) => {
        try {
          if (!map.value) return;
          if (!newCenter || newCenter.length !== 2) return;
          const [lat, lng] = newCenter;
          setCenter(lat, lng, props.zoom);
        } catch (error) {
          // ignore center sync error
        }
      },
      { immediate: true }
    );

    watch(
      () => props.zoom,
      (newZoom) => {
        try {
          if (!map.value) return;
          if (typeof newZoom !== 'number') return;
          const [lat, lng] = props.center || [null, null];
          if (lat == null || lng == null) return;
          setCenter(lat, lng, newZoom);
        } catch (error) {
          // ignore zoom sync error
        }
      },
      { immediate: false }
    );
  };

  onMounted(async () => {
    await setupMarkerRefreshBridge();
    setupMarkerClickHandling();
    setupExternalEventListeners();
    setupInitialViewSync();
  });

  onUnmounted(() => {
    cleanupExternalEventListeners();
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
  });

  watchPanoramaProps();
  watchGlobalPoints();
  watchMapType();
  watchCenterAndZoom();

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
      _locateUser: locateUser,
      _fitAllMarkers: fitAllMarkers,
    },
  };
}
