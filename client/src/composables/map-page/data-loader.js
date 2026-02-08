import { ElMessage } from 'element-plus';

const defaultWindow = typeof window !== 'undefined' ? window : undefined;

export function createMapDataLoader(options) {
  const {
    panoramaStore,
    appStore,
    pointsApi,
    kmlApi,
    windowRef = defaultWindow,
    message = ElMessage,
    delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  const ALL_POINTS_PAGE_SIZE = 10000;
  const MAX_POINTS_PAGES = 20;

  const retry = async (fn, { retries = 3, baseDelay = 200 } = {}) => {
    let attempt = 0;
    let lastError;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= retries) {
          throw lastError;
        }
        const wait = Math.pow(2, attempt) * baseDelay;
        await delay(wait);
      }
    }
    return undefined;
  };

  const fetchAllPoints = async () => {
    const firstResponse = await pointsApi.getAllPoints({
      page: 1,
      pageSize: ALL_POINTS_PAGE_SIZE,
      respectFolderVisibility: true,
    });

    const firstData = Array.isArray(firstResponse?.data) ? firstResponse.data : [];
    const pagination = firstResponse?.pagination || {};
    const total = Number(pagination.total) || firstData.length;
    const pageSize = Number(pagination.pageSize) || ALL_POINTS_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (totalPages <= 1) {
      return firstData;
    }

    const cappedPages = Math.min(totalPages, MAX_POINTS_PAGES);
    const requests = [];
    for (let page = 2; page <= cappedPages; page += 1) {
      requests.push(
        pointsApi.getAllPoints({
          page,
          pageSize,
          respectFolderVisibility: true,
        })
      );
    }

    const responses = await Promise.all(requests);
    const merged = [
      ...firstData,
      ...responses.flatMap((response) => (Array.isArray(response?.data) ? response.data : [])),
    ];

    const uniqueMap = new Map();
    for (const point of merged) {
      const key = point?.id ?? `${point?.type || 'point'}:${point?.lat}:${point?.lng}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, point);
      }
    }

    return Array.from(uniqueMap.values());
  };

  const loadAllPoints = async () => {
    try {
      const [allPoints, kmlFilesResponse] = await Promise.all([
        fetchAllPoints(),
        kmlApi.getKmlFiles({
          respectFolderVisibility: true,
          includeBasemap: false,
          _t: Date.now(),
        }),
      ]);

      const filteredPoints = allPoints.filter((point) => {
        if (point.type === 'kml') return false;
        const lat = point.lat ?? point.latitude;
        const lng = point.lng ?? point.longitude;
        return lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
      });

      if (windowRef) {
        windowRef.allPoints = filteredPoints;
      }

      const kmlFiles = kmlFilesResponse.data || [];
      const kmlFilesWithStyles = await Promise.all(
        kmlFiles.map(async (file) => {
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              const styleResponse = await kmlApi.getKmlFileStyles(file.id);
              return { ...file, styleConfig: styleResponse.data };
            } catch (error) {
              retryCount += 1;
              if (retryCount >= maxRetries) {
                return { ...file, styleConfig: null };
              }
              await delay(Math.pow(2, retryCount) * 100);
            }
          }
          return { ...file, styleConfig: null };
        })
      );

      if (windowRef) {
        windowRef.allKmlFiles = kmlFilesWithStyles;
      }
    } catch (error) {
      if (windowRef) {
        windowRef.allPoints = [];
        windowRef.allKmlFiles = [];
      }
      throw error;
    }
  };

  const loadInitialData = async ({ mapRef, kmlLayersVisibleRef }) => {
    try {
      await retry(() => loadAllPoints(), { retries: 3, baseDelay: 150 });

      if (windowRef && Array.isArray(windowRef.allPoints) && windowRef.allPoints.length > 0) {
        // 不将全量点位写入 panoramaStore（侧边栏列表），避免浪费流量和渲染资源
        // 地图标记直接从 window.allPoints 读取，侧边栏通过搜索按需加载
        panoramaStore.setPagination({
          page: 1,
          pageSize: 20,
          total: windowRef.allPoints.length,
        });
      }

      await delay(500);
      if (!mapRef?.value) return;

      if (windowRef && Array.isArray(windowRef.allPoints) && windowRef.allPoints.length > 0) {
        try {
          const mod = await import('@/utils/marker-refresh.js');
          const points = windowRef.allPoints;

          let refreshed = await mod.refreshAllMarkers(points);
          if (!refreshed) {
            await delay(200);
            refreshed = await mod.refreshAllMarkers(points);
          }
        } catch (error) {
          try {
            mapRef.value?.clearMarkers?.();
            mapRef.value?.addPointMarkers?.(windowRef.allPoints);
          } catch (innerError) {
            // ignore marker refresh failures
          }
        }
      }

      if (!appStore.initialViewSettings?.enabled) {
        mapRef.value.fitBounds?.();
      }

      if (
        kmlLayersVisibleRef?.value &&
        windowRef &&
        Array.isArray(windowRef.allKmlFiles) &&
        windowRef.allKmlFiles.length > 0
      ) {
        mapRef.value.clearKmlLayers?.();
        mapRef.value.addKmlLayers?.(windowRef.allKmlFiles);
      }
    } catch (error) {
      message.error?.({ message: `加载数据失败: ${error.message}`, duration: 1000 });
    }
  };

  const initializePage = async ({ mapRef, kmlLayersVisibleRef }) => {
    await appStore.initApp();
    if (windowRef) {
      windowRef.kmlLayersVisible = kmlLayersVisibleRef?.value ?? true;
    }
    await loadInitialData({ mapRef, kmlLayersVisibleRef });
  };

  const toggleKmlLayers = ({ mapRef, kmlLayersVisibleRef }) => {
    if (!kmlLayersVisibleRef) return;
    kmlLayersVisibleRef.value = !kmlLayersVisibleRef.value;

    if (windowRef) {
      windowRef.kmlLayersVisible = kmlLayersVisibleRef.value;
    }

    const mapExpose = mapRef?.value;
    if (!mapExpose) {
      console.warn('地图组件引用不存在，无法切换KML图层');
      return;
    }

    if (kmlLayersVisibleRef.value) {
      if (windowRef && Array.isArray(windowRef.allKmlFiles) && windowRef.allKmlFiles.length > 0) {
        mapExpose.clearKmlLayers?.();
        mapExpose.addKmlLayers?.(windowRef.allKmlFiles);
      }
    } else {
      mapExpose.clearKmlLayers?.();
    }
  };

  /**
   * 切换点位（视频、全景图、图片集）的可见性
   * 通过控制各类型点位的 pane 的 display 样式来实现隐藏/显示
   * @param {Object} options - 包含 mapRef 和 markersVisibleRef
   */
  const toggleMarkers = ({ mapRef, markersVisibleRef }) => {
    if (!markersVisibleRef) return;
    markersVisibleRef.value = !markersVisibleRef.value;

    if (windowRef) {
      windowRef.markersVisible = markersVisibleRef.value;
    }

    const mapExpose = mapRef?.value;
    if (!mapExpose) {
      console.warn('地图组件引用不存在，无法切换点位显示');
      return;
    }

    const mapInstance = mapExpose.map;
    if (!mapInstance || typeof mapInstance.getPane !== 'function') {
      console.warn('地图实例不存在或不支持 getPane，无法切换点位显示');
      return;
    }

    // 通过控制 pane 的 display 属性来隐藏/显示点位
    const paneNames = ['videoPane', 'panoramaPane', 'imageSetPane'];
    const displayValue = markersVisibleRef.value ? '' : 'none';

    for (const paneName of paneNames) {
      const pane = mapInstance.getPane(paneName);
      if (pane) {
        pane.style.display = displayValue;
      }
    }
  };

  const loadMore = async () => {
    await panoramaStore.loadMore();
  };

  return {
    initializePage,
    loadInitialData,
    loadAllPoints,
    toggleKmlLayers,
    toggleMarkers,
    loadMore,
    retry,
  };
}
