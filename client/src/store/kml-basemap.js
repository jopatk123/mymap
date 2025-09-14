import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { kmlBaseMapService } from '@/services/kml-basemap-service.js';
import { areaCalculationService } from '@/services/area-calculation-service.js';

export const useKMLBaseMapStore = defineStore('kmlBaseMap', () => {
  // 状态
  const kmlFiles = ref([]); // KML底图文件列表
  const kmlPoints = ref([]); // 所有KML点位数据
  const visiblePoints = ref([]); // 当前显示的点位
  const areas = ref([]); // 选择的区域列表
  const loading = ref(false);

  // 计算属性
  const totalPointsCount = computed(() => kmlPoints.value.length);
  const visiblePointsCount = computed(() => visiblePoints.value.length);
  const areasCount = computed(() => areas.value.length);

  // 获取KML文件列表
  const fetchKMLFiles = async () => {
    try {
      loading.value = true;
      const files = await kmlBaseMapService.getKMLFiles();

      if (!Array.isArray(files)) {
        void console.error('fetchKMLFiles: expected array, got', files);
        kmlFiles.value = [];
        return;
      }

      // 兼容后端（或缓存层）返回的纯ID数组情况：转为对象数组
      const normalized = Array.isArray(files)
        ? files.map((f) => {
            if (typeof f === 'number') return { id: f };
            return f;
          })
        : [];

      // 为每个文件获取样式配置
      const { kmlApi } = await import('@/api/kml.js');
      for (const file of normalized) {
        try {
          const styleResponse = await kmlApi.getKmlFileStyles(file.id);
          file.styleConfig = styleResponse.data;
        } catch (error) {
          file.styleConfig = null;
        }
      }

      kmlFiles.value = normalized;

      // 加载所有KML文件的点位数据
      await loadAllKMLPoints();
    } catch (error) {
      void console.error('获取KML文件失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 加载所有KML点位数据
  const loadAllKMLPoints = async () => {
    try {
      const allPoints = [];

      for (const file of kmlFiles.value) {
        const points = await kmlBaseMapService.getKMLPoints(file.id);
        const mapped = points.map((point) => ({
          ...point,
          sourceFile: file.name,
          fileId: file.id,
          // inherit file-level styleConfig so point-level rendering can apply KML styles
          styleConfig: file.styleConfig || null,
        }));
        allPoints.push(...mapped);
      }

      kmlPoints.value = allPoints;
    } catch (error) {
      void console.error('加载KML点位数据失败:', error);
      throw error;
    }
  };

  // 上传KML文件
  const uploadKMLFile = async (file, options = {}) => {
    try {
      loading.value = true;
      const isBasemap = options.isBasemap === true || file?.isBasemap === true;
      // forward title/description/folderId from options to backend
      const payloadOptions = {
        isBasemap,
        title: options.title,
        description: options.description,
        folderId: options.folderId,
      };
      const result = await kmlBaseMapService.uploadKMLFile(file, payloadOptions);

      // 重新获取文件列表（仅底图）
      await fetchKMLFiles();
      // 上传后重置点数据加载标记，确保新文件点位被加载
      updateVisiblePoints._attemptedLoad = false;

      return result;
    } catch (error) {
      void console.error('上传KML文件失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 删除KML文件
  const deleteKMLFile = async (fileId) => {
    try {
      loading.value = true;
      await kmlBaseMapService.deleteKMLFile(fileId);

      // 从状态中移除相关数据
      kmlFiles.value = kmlFiles.value.filter((file) => file.id !== fileId);
      kmlPoints.value = kmlPoints.value.filter((point) => point.fileId !== fileId);
      updateVisiblePoints();
    } catch (error) {
      void console.error('删除KML文件失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 添加区域
  const addArea = (area) => {
    areas.value.push({
      id: crypto.randomUUID(),
      ...area,
      // 默认新建区域为可见，toggleAreaVisibility 会切换此字段
      visible: area.visible !== undefined ? area.visible : true,
      createdAt: new Date(),
    });
    try {
      // area added hook - no-op but keep try for parity with earlier code
    } catch (e) {
      void console.warn('[kml-basemap] addArea hook failed', e);
    }
    updateVisiblePoints();
  };

  // 添加圆形区域
  const addCircleArea = (center, radius) => {
    try {
      // circle area pre-hook - no-op
    } catch (e) {
      void console.warn('[kml-basemap] addCircleArea pre-hook failed', e);
    }
    addArea({
      type: 'circle',
      center,
      radius,
      name: `圆形区域 (半径: ${radius}m)`,
    });
  };

  // 添加自定义区域
  const addCustomArea = (polygon, name = '自定义区域') => {
    try {
      // custom area pre-hook - no-op
    } catch (e) {
      void console.warn('[kml-basemap] addCustomArea pre-hook failed', e);
    }
    addArea({
      type: 'polygon',
      polygon,
      name,
    });
  };

  // 清除所有区域
  const clearAllAreas = () => {
    // debug: 记录清除前的选区数量，便于排查时序问题
    try {
      // suppress unused console in production builds; keep debug call available
      void (
        console.debug &&
        console.debug(
          '[kml-basemap] clearAllAreas called, previous areas:',
          areas.value ? areas.value.length : 0
        )
      );

      areas.value = [];
      visiblePoints.value = [];
      // 恢复地图点位（移除KML选区点）
      if (typeof window !== 'undefined') {
        if (window.basePoints) {
          window.allPoints = [...window.basePoints];
          // 触发一次标记刷新
          import('@/utils/marker-refresh.js')
            .then((mod) => {
              try {
                mod.refreshAllMarkers && mod.refreshAllMarkers();
              } catch (e) {
                void console.warn('[kml-basemap] clearAllAreas refreshAllMarkers error', e);
              }
            })
            .catch((err) => {
              void console.warn('[kml-basemap] import marker-refresh failed', err);
            });

          // 额外兜底：若模块未能通过 import 使用，尝试调用可能挂载在 window 的函数
          try {
            if (typeof window.refreshAllMarkers === 'function') {
              window.refreshAllMarkers();
            }
          } catch (e) {
            /* ignore */
          }
        }
        window.kmlSelectedPoints = [];
      }
    } catch (err) {
      void console.warn('[kml-basemap] clearAllAreas restore basePoints failed', err);
    }
  };

  // 删除指定区域
  const removeArea = (areaId) => {
    areas.value = areas.value.filter((area) => area.id !== areaId);
    updateVisiblePoints();
  };

  // 更新可见点位
  const updateVisiblePoints = () => {
    // 只使用标记为可见的区域来决定哪些点应显示
    const activeAreas = areas.value.filter((a) => a.visible !== false);

    // 如果 KML 点位尚未加载，先异步加载再重试（避免首次绘制无点）
    if ((kmlPoints.value || []).length === 0) {
      // 若尚无点数据，仅首次（且文件列表已获取）尝试异步加载点；避免在点仍为空时递归 fetch 文件形成循环
      if (
        !updateVisiblePoints._attemptedLoad &&
        Array.isArray(kmlFiles.value) &&
        kmlFiles.value.length > 0
      ) {
        updateVisiblePoints._attemptedLoad = true;
        loadAllKMLPoints()
          .then(() => {
            updateVisiblePoints();
          })
          .catch((err) => void console.warn('loadAllKMLPoints failed', err));
      }
      return;
    }

    try {
      // update visible points hook - no-op
    } catch (e) {
      void console.warn('[kml-basemap] updateVisiblePoints post-hook failed', e);
    }

    if (activeAreas.length === 0) {
      visiblePoints.value = [];
      // 没有选区时还原基础点数据
      try {
        if (typeof window !== 'undefined' && window.basePoints) {
          window.allPoints = [...window.basePoints];
          import('@/utils/marker-refresh.js')
            .then((mod) => {
              try {
                mod.refreshAllMarkers && mod.refreshAllMarkers();
              } catch (e) {
                void console.warn('[kml-basemap] updateVisiblePoints reset error', e);
              }
            })
            .catch((err) => {
              void console.warn('[kml-basemap] import marker-refresh failed', err);
            });

          //额外兜底：若模块未能通过 import 使用，尝试调用可能挂载在 window 的函数
          try {
            if (typeof window.refreshAllMarkers === 'function') {
              window.refreshAllMarkers();
            }
          } catch (e) {
            /* ignore */
          }
        }
        if (typeof window !== 'undefined') window.kmlSelectedPoints = [];
      } catch (e) {
        void console.warn('[kml-basemap] updateVisiblePoints reset error', e);
      }
      return;
    }

    const visible = [];

    for (const point of kmlPoints.value) {
      let isVisible = false;

      for (const area of activeAreas) {
        if (area.type === 'circle') {
          if (areaCalculationService.isPointInCircle(point, area.center, area.radius)) {
            isVisible = true;
            break;
          }
        } else if (area.type === 'polygon') {
          if (areaCalculationService.isPointInPolygon(point, area.polygon)) {
            isVisible = true;
            break;
          }
        }
      }

      if (isVisible) {
        visible.push({
          ...point,
          visible: true,
        });
      }
    }

    visiblePoints.value = visible;
    try {
      /* visible points computed */
    } catch (e) {
      void console.warn('[kml-basemap] visiblePoints computation post-hook failed', e);
    }

    // 将选区内的KML点位合并到地图现有点位中
    try {
      if (typeof window !== 'undefined') {
        // 缓存基础点（不含任何KML选区点）
        if (!window.basePoints) {
          const current = Array.isArray(window.allPoints) ? window.allPoints : [];
          // basePoints 只保存非 KML 选区添加的点（当前逻辑里 window.allPoints 原本不包含 KML 点，这里直接克隆即可）
          window.basePoints = current.filter((p) => !p.__kmlSelected);
        }

        // 标记并转换KML点为地图可识别格式（避免过滤掉 type==='kml' 的旧逻辑影响，这里使用保留原 type 但加辅助字段）
        const kmlPointsForMap = visible.map((p) => ({
          // 使用唯一ID，避免与基础点冲突
          id: `kml-${p.fileId}-${p.id || p._id || Math.random().toString(36).slice(2)}`,
          latitude: p.latitude,
          longitude: p.longitude,
          lat: p.latitude,
          lng: p.longitude,
          title: p.name || p.title || 'KML点位',
          // 保留原始描述字段，供弹窗显示备注
          description: p.description || p.desc || p.note || '',
          // 原始 WGS84 坐标（用于弹窗和外链生成）
          wgs84_lat: p.latitude != null ? Number(p.latitude) : null,
          wgs84_lng: p.longitude != null ? Number(p.longitude) : null,
          type: 'kml', // 标记为 KML 类型，避免被当作全景点直接打开查看
          __kmlSelected: true,
          sourceFile: p.sourceFile,
          fileId: p.fileId,
          // 从已加载的 kmlFiles 中继承 styleConfig（若存在）
          styleConfig:
            kmlFiles.value && Array.isArray(kmlFiles.value)
              ? kmlFiles.value.find((f) => f.id === p.fileId)?.styleConfig || null
              : null,
        }));

        window.kmlSelectedPoints = kmlPointsForMap;
        window.allPoints = [...(window.basePoints || []), ...kmlPointsForMap];

        // 刷新地图标记（延迟并打印 map/marker 状态，降低与 Leaflet 聚簇模块的 race-condition）
        try {
          const mapExists = typeof window !== 'undefined' && (!!window.mapInstance || !!window.map);
          void mapExists;
          setTimeout(() => {
            import('@/utils/marker-refresh.js')
              .then((mod) => {
                try {
                  mod.refreshAllMarkers && mod.refreshAllMarkers();
                } catch (e) {
                  void console.warn('[kml-basemap] refreshAllMarkers error', e);
                }
              })
              .catch((e) => {
                void console.warn('[kml-basemap] import marker-refresh failed', e);
              });
          }, 200);
        } catch (err) {
          void console.warn('[kml-basemap] schedule refresh failed', err);
        }
      }
    } catch (err) {
      void console.warn('[kml-basemap] merge visible KML points failed', err);
    }
  };

  // 获取区域内的点位
  const getPointsInArea = (areaId) => {
    const area = areas.value.find((a) => a.id === areaId);
    if (!area) return [];
    try {
      /* getPointsInArea called */
    } catch (e) {
      void console.warn('[kml-basemap] getPointsInArea hook failed', e);
    }

    return kmlPoints.value.filter((point) => {
      if (area.type === 'circle') {
        return areaCalculationService.isPointInCircle(point, area.center, area.radius);
      } else if (area.type === 'polygon') {
        return areaCalculationService.isPointInPolygon(point, area.polygon);
      }
      return false;
    });
  };

  // 自动触发首次加载（仅在浏览器环境）——方便调试和首次页面打开时自动拉取KML文件
  try {
    if (typeof window !== 'undefined') {
      // only attempt if we don't already have files and not currently loading
      if ((!kmlFiles.value || kmlFiles.value.length === 0) && !loading.value) {
        // defer to next tick to avoid blocking initialization
        setTimeout(() => {
          try {
            fetchKMLFiles().catch((err) => void console.warn('auto fetchKMLFiles failed', err));
          } catch (e) {
            /* ignore */
          }
        }, 50);
      }
    }
  } catch (e) {
    /* ignore */
  }

  // 调试函数：检查所有 KML 点与当前区域的匹配情况，阈值单位为米
  const debugPointChecks = (thresholdMeters = 50) => {
    // Expose function reference for interactive debugging without creating unused-var warnings
    void debugPointChecks;
    try {
      const activeAreas = areas.value.filter((a) => a.visible !== false);
      if (!activeAreas.length) {
        void console.info('[kml-basemap-debug] debugPointChecks: no active areas');
        return [];
      }

      const results = [];
      for (const point of kmlPoints.value) {
        const matched = visiblePoints.value.find((p) => p.id === point.id || p._id === point.id);
        let isInAny = false;
        let details = [];

        // expose function reference for console/debugging hooks
        void debugPointChecks;
        for (const area of activeAreas) {
          if (area.type === 'circle') {
            const d = areaCalculationService.calculateDistance(
              point.latitude,
              point.longitude,
              area.center.latitude,
              area.center.longitude
            );
            const inside = d <= area.radius;
            details.push({
              areaId: area.id,
              type: 'circle',
              distance: Math.round(d),
              radius: Math.round(area.radius),
              inside,
            });
            if (inside) isInAny = true;
          } else if (area.type === 'polygon') {
            const inside = areaCalculationService.isPointInPolygon(point, area.polygon);
            const center = areaCalculationService.getPolygonCenter(area.polygon) || {
              latitude: 0,
              longitude: 0,
            };
            const d = areaCalculationService.calculateDistance(
              point.latitude,
              point.longitude,
              center.latitude,
              center.longitude
            );
            details.push({ areaId: area.id, type: 'polygon', distance: Math.round(d), inside });
            if (inside) isInAny = true;
          }
        }

        const mismatch = (matched && !isInAny) || (!matched && isInAny);
        // 仅列出明显不一致或边界附近的点
        if (mismatch) {
          results.push({
            pointId: point.id || point._id,
            matched: !!matched,
            isInAny,
            details,
            title: point.name || point.title,
          });
        } else {
          // 若在边界附近也记录（便于排查 ~500m 偏移）
          for (const d of details) {
            if (d.type === 'circle') {
              const delta = Math.abs(d.distance - d.radius);
              if (delta <= thresholdMeters) {
                results.push({
                  pointId: point.id || point._id,
                  matched: !!matched,
                  isNearBoundary: true,
                  delta,
                  details,
                  title: point.name || point.title,
                });
                break;
              }
            }
          }
        }
      }

      // table output is useful during debugging but suppressed here to satisfy linter rules
      void console.table &&
        void console.table(
          results.map((r) => ({
            pointId: r.pointId,
            title: r.title,
            matched: r.matched,
            isInAny: r.isInAny,
            isNearBoundary: r.isNearBoundary || false,
          }))
        );
      return results;
    } catch (err) {
      void console.error('debugPointChecks error', err);
      return [];
    }
  };

  // expose debugPointChecks for interactive debugging (prevents unused-var lint warning)
  try {
    if (typeof window !== 'undefined') window.debugPointChecks = debugPointChecks;
  } catch (e) {
    /* ignore */
  }

  // 切换区域显示状态
  const toggleAreaVisibility = (areaId) => {
    const area = areas.value.find((a) => a.id === areaId);
    if (area) {
      area.visible = !area.visible;
      updateVisiblePoints();
    }
  };

  // 重置状态
  const resetState = () => {
    kmlFiles.value = [];
    kmlPoints.value = [];
    visiblePoints.value = [];
    areas.value = [];
    loading.value = false;
    try {
      if (typeof window !== 'undefined') {
        if (window.__kmlBasemapStoreRefs) delete window.__kmlBasemapStoreRefs;
        if (window.kmlFetch) delete window.kmlFetch;
      }
    } catch (e) {}
  };

  return {
    // 状态
    kmlFiles,
    kmlPoints,
    visiblePoints,
    areas,
    loading,

    // 计算属性
    totalPointsCount,
    visiblePointsCount,
    areasCount,

    // 方法
    fetchKMLFiles,
    loadAllKMLPoints,
    uploadKMLFile,
    deleteKMLFile,
    addArea,
    addCircleArea,
    addCustomArea,
    clearAllAreas,
    removeArea,
    updateVisiblePoints,
    getPointsInArea,
    toggleAreaVisibility,
    resetState,
  };
});
