import { ref, computed, reactive, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { usePanoramaStore } from '@/store/panorama.js';
import { useAppStore } from '@/store/app.js';
import { pointsApi } from '@/api/points.js';
import { kmlApi } from '@/api/kml.js';

/**
 * 地图页面组合函数
 * 管理地图页面的状态和数据，包括点位数据加载、KML图层管理等
 */
export function useMapPage() {
  // Stores
  const panoramaStore = usePanoramaStore();
  const appStore = useAppStore();

  // Store数据
  const { panoramas, currentPanorama, pagination, visiblePanoramas, hasMore, loading } =
    storeToRefs(panoramaStore);
  // pagination may be unused in some views; mark to avoid linter warning
  void pagination;
  // mark onMounted as intentionally imported (used by consumers or reserved)
  void onMounted;

  const { sidebarCollapsed, panoramaListVisible, mapConfig, isOnline } = storeToRefs(appStore);

  // 组件引用
  const mapRef = ref(null);

  // 响应式数据
  const searchParams = reactive({
    keyword: '',
    sortBy: 'createdAt',
  });
  const selectedPanorama = ref(null);
  const selectedVideo = ref(null);
  const showPanoramaModal = ref(false);
  const showVideoModal = ref(false);
  const showUploadDialog = ref(false);

  const showBatchUploadDialog = ref(false);
  const showPanoramaViewer = ref(false);
  const panoramaViewerLoading = ref(false);
  const autoRotating = ref(false);
  const kmlLayersVisible = ref(true);
  const showKmlSettings = ref(false);
  const showPointSettings = ref(false);

  // 计算属性
  // 点位列表数量以当前列表渲染的数据条数为准
  const totalCount = computed(() => (Array.isArray(panoramas.value) ? panoramas.value.length : 0));

  // 初始化
  const initializePage = async () => {
    // 初始化应用（包括加载初始显示设置）
    await appStore.initApp();

    // 初始化全局KML图层显示状态
    window.kmlLayersVisible = kmlLayersVisible.value;

    // 加载全景图数据
    await loadInitialData();
  };

  // 通用重试封装（指数退避）
  const retry = async (fn, { retries = 3, baseDelay = 200 } = {}) => {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt >= retries) throw err;
        const delay = Math.pow(2, attempt) * baseDelay;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  };

  // 加载初始数据
  const loadInitialData = async () => {
    try {
      // 只加载一次点位数据，避免重复调用
      // 保存设置后，后端有可能短暂重启，给点位与KML列表增加重试
      await retry(() => loadAllPoints(), { retries: 3, baseDelay: 150 });

      // 将所有点位数据同步到panoramaStore（包括全景图和视频点位）
      if (window.allPoints && window.allPoints.length > 0) {
        try {
          panoramaStore.setPanoramas(window.allPoints);
          // 同步更新分页信息，确保底部统计正确
          panoramaStore.setPagination({
            page: 1,
            pageSize: window.allPoints.length,
            total: window.allPoints.length,
          });
        } catch (error) {
          console.warn('同步点位数据到store失败:');
        }
      }
      // 数据加载完成后自动适应所有标记点并初始化KML图层
      setTimeout(() => {
        if (mapRef.value) {
          // 只有当初始显示设置未启用时，才自动适应所有标记
          if (!appStore.initialViewSettings?.enabled) {
            mapRef.value.fitBounds();
          }

          // 如果KML图层应该显示，则主动加载KML图层
          if (kmlLayersVisible.value && window.allKmlFiles && window.allKmlFiles.length > 0) {
            mapRef.value.addKmlLayers(window.allKmlFiles);
          }
        }
      }, 500);
    } catch (error) {
      ElMessage.error({ message: '加载数据失败: ' + error.message, duration: 1000 });
    }
  };

  // 加载所有点位数据
  const loadAllPoints = async () => {
    try {
      // 1. 并行加载点位数据和KML文件基础数据
      const [pointsResponse, kmlFilesResponse] = await Promise.all([
        pointsApi.getAllPoints({
          page: 1,
          pageSize: 10000,
          respectFolderVisibility: true,
        }),
        // 这里仅加载普通 KML（排除底图），底图由 basemap store 单独管理
        kmlApi.getKmlFiles({
          respectFolderVisibility: true,
          includeBasemap: false,
          _t: new Date().getTime(),
        }),
      ]);

      // 2. 处理点位数据，过滤有效的点位
      const allPoints = pointsResponse.data || [];
      const filteredPoints = allPoints.filter((point) => {
        // 排除KML文件
        if (point.type === 'kml') return false;

        // 确保有有效的坐标
        const lat = point.lat || point.latitude;
        const lng = point.lng || point.longitude;
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      });

      window.allPoints = filteredPoints;

      // 3. 为每个KML文件加载其详细样式（添加重试机制）
      const kmlFiles = kmlFilesResponse.data || [];
      const kmlFilesWithStyles = await Promise.all(
        kmlFiles.map(async (file) => {
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              const styleResponse = await kmlApi.getKmlFileStyles(file.id);
              // 将样式配置合并到文件对象中
              return { ...file, styleConfig: styleResponse.data };
            } catch (error) {
              retryCount++;
              console.warn(`加载KML文件 ${file.id} 的样式失败 (尝试 ${retryCount}/${maxRetries}):`, error);
              
              if (retryCount >= maxRetries) {
                // 所有重试都失败了，返回原始文件信息并附带空样式配置
                return { ...file, styleConfig: null };
              }
              
              // 等待一段时间后重试（指数退避）
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
          }
        })
      );

      // 4. 将包含完整样式信息的KML文件列表存入全局变量
      window.allKmlFiles = kmlFilesWithStyles;
    } catch (error) {
      console.error('加载点位数据失败:', error);
      window.allPoints = [];
      window.allKmlFiles = [];
    }
  };

  // 加载更多
  const loadMore = async () => {
    await panoramaStore.loadMore();
  };

  // 切换KML图层显示
  const toggleKmlLayers = () => {
    kmlLayersVisible.value = !kmlLayersVisible.value;

    // 同步到全局变量
    window.kmlLayersVisible = kmlLayersVisible.value;

    // debug: 切换KML图层显示状态 (suppressed)

    // 通知地图组件更新KML图层显示状态
    if (mapRef.value) {
      if (kmlLayersVisible.value) {
        // 显示KML图层
        // debug: 准备显示KML图层 (suppressed)
        if (window.allKmlFiles && window.allKmlFiles.length > 0) {
          // 先清除现有图层，避免重复
          mapRef.value.clearKmlLayers();
          mapRef.value.addKmlLayers(window.allKmlFiles);
        }
      } else {
        // 隐藏KML图层
        // debug: 隐藏KML图层 (suppressed)
        mapRef.value.clearKmlLayers();
      }
    } else {
      console.warn('地图组件引用不存在，无法切换KML图层');
    }
  };

  return {
    // Store数据
    panoramas,
    currentPanorama,
    visiblePanoramas,
    hasMore,
    loading,
    sidebarCollapsed,
    panoramaListVisible,
    mapConfig,
    isOnline,
    totalCount,

    // 组件状态
    mapRef,
    searchParams,
    selectedPanorama,
    selectedVideo,
    showPanoramaModal,
    showVideoModal,
    showUploadDialog,
    showBatchUploadDialog,

    showPanoramaViewer,
    panoramaViewerLoading,
    autoRotating,
    kmlLayersVisible,
    showKmlSettings,
    showPointSettings,

    // 方法
    initializePage,
    loadInitialData,
    loadMore,
    toggleKmlLayers,
    // helpers for dialogs
    openBatchUploadFromSingle: () => {
      showUploadDialog.value = false;
      showBatchUploadDialog.value = true;
    },
  };
}
