import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { kmlBaseMapService } from '@/services/kml-basemap-service.js';
import { areaCalculationService } from '@/services/area-calculation-service.js';
import { normalizeKmlFiles, attachFileStyles, mapPointWithFile } from './kml-basemap-helpers.js';
import { createAreaHandlers } from './kml-basemap-areas.js';

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

      const normalized = normalizeKmlFiles(files);
      const withStyles = await attachFileStyles(normalized);
      kmlFiles.value = withStyles;

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
        const mapped = points.map((point) => mapPointWithFile(point, file));
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

  const {
    addArea,
    addCircleArea,
    addCustomArea,
    clearAllAreas,
    removeArea,
    updateVisiblePoints,
    getPointsInArea,
    toggleAreaVisibility,
    debugPointChecks,
  } = createAreaHandlers({
    areas,
    visiblePoints,
    kmlPoints,
    kmlFiles,
    loadAllKMLPoints,
    areaCalculationService,
  });

  // expose debugPointChecks for interactive debugging (prevents unused-var lint warning)
  void debugPointChecks;

  // 自动触发首次加载（仅在浏览器环境）——方便调试和首次页面打开时自动拉取KML文件
  try {
    if (typeof window !== 'undefined') {
      if ((!kmlFiles.value || kmlFiles.value.length === 0) && !loading.value) {
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
