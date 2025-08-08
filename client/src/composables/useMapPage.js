import { ref, computed, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { usePanoramaStore } from '@/store/panorama.js'
import { useAppStore } from '@/store/app.js'
import { pointsApi } from '@/api/points.js'
import { kmlApi } from '@/api/kml.js'

export function useMapPage() {
  // Stores
  const panoramaStore = usePanoramaStore()
  const appStore = useAppStore()

  // Store数据
  const {
    panoramas,
    currentPanorama,
    pagination,
    visiblePanoramas,
    hasMore,
    loading
  } = storeToRefs(panoramaStore)

  const {
    sidebarCollapsed,
    panoramaListVisible,
    mapConfig,
    isOnline
  } = storeToRefs(appStore)

  // 组件引用
  const mapRef = ref(null)

  // 响应式数据
  const searchParams = reactive({
    keyword: '',
    sortBy: 'createdAt'
  })
  const selectedPanorama = ref(null)
  const selectedVideo = ref(null)
  const showPanoramaModal = ref(false)
  const showVideoModal = ref(false)
  const showUploadDialog = ref(false)
  const showSettings = ref(false)
  const showPanoramaViewer = ref(false)
  const panoramaViewerLoading = ref(false)
  const autoRotating = ref(false)
  const kmlLayersVisible = ref(true)
  const showKmlSettings = ref(false)
  const showPointSettings = ref(false)

  // 计算属性
  const totalCount = computed(() => pagination.value.total)

  // 初始化
  const initializePage = async () => {
    // 初始化应用
    appStore.initApp()

    // 初始化全局KML图层显示状态
    window.kmlLayersVisible = kmlLayersVisible.value

    // 加载全景图数据
    await loadInitialData()
  }

  // 加载初始数据
  const loadInitialData = async () => {
    try {
      // 只加载一次点位数据，避免重复调用
      await loadAllPoints()
      
      // 将点位数据同步到panoramaStore
      if (window.allPoints && window.allPoints.length > 0) {
        panoramaStore.setPanoramas(window.allPoints.filter(point => point.type === 'panorama'))
      }
      // 数据加载完成后自动适应所有标记点并初始化KML图层
      setTimeout(() => {
        if (mapRef.value) {
          mapRef.value.fitBounds()
          // 如果KML图层应该显示，则主动加载KML图层
          if (kmlLayersVisible.value && window.allKmlFiles && window.allKmlFiles.length > 0) {
            mapRef.value.addKmlLayers(window.allKmlFiles)
          }
        }
      }, 500)
    } catch (error) {
      ElMessage.error('加载数据失败: ' + error.message)
    }
  }

  // 加载所有点位数据
  const loadAllPoints = async () => {
    try {
            // 1. 并行加载点位数据和KML文件基础数据
      const [pointsResponse, kmlFilesResponse] = await Promise.all([
        pointsApi.getAllPoints({
          respectFolderVisibility: true
        }),
        kmlApi.getKmlFiles({
          respectFolderVisibility: true,
          _t: new Date().getTime()
        })
      ]);

      // 2. 处理点位数据，过滤掉KML文件和无效坐标的点位
      const allPoints = pointsResponse.data || [];
      console.log('🔍 原始点位数据:', allPoints.length, allPoints)
      
      const filteredPoints = allPoints.filter(point => {
        // 排除KML文件
        if (point.type === 'kml') {
          console.log('❌ 过滤掉KML文件:', point)
          return false
        }
        
        // 确保有有效的坐标
        const lat = point.lat || point.latitude
        const lng = point.lng || point.longitude
        const isValid = lat != null && lng != null && !isNaN(lat) && !isNaN(lng)
        
        if (!isValid) {
          console.log('❌ 过滤掉无效坐标的点位:', { point, lat, lng })
        }
        
        return isValid
      })
      
      window.allPoints = filteredPoints
      console.log('✅ 过滤后的点位数据:', filteredPoints.length, filteredPoints)


      // 3. 为每个KML文件加载其详细样式
      const kmlFiles = kmlFilesResponse.data || [];
      const kmlFilesWithStyles = await Promise.all(
        kmlFiles.map(async (file) => {
          try {
            const styleResponse = await kmlApi.getKmlFileStyles(file.id);
            // 将样式配置合并到文件对象中
            return { ...file, styleConfig: styleResponse.data };
          } catch (error) {
            console.warn(`加载KML文件 ${file.id} 的样式失败:`, error);
            // 如果样式加载失败，则返回原始文件信息并附带空样式配置
            return { ...file, styleConfig: null };
          }
        })
      );

      // 4. 将包含完整样式信息的KML文件列表存入全局变量
      window.allKmlFiles = kmlFilesWithStyles;

    } catch (error) {
      console.error('加载点位数据失败:', error)
      window.allPoints = []
      window.allKmlFiles = []
    }
  }

  // 加载更多
  const loadMore = async () => {
    await panoramaStore.loadMore()
  }

  // 切换KML图层显示
  const toggleKmlLayers = () => {
    kmlLayersVisible.value = !kmlLayersVisible.value

    // 同步到全局变量
    window.kmlLayersVisible = kmlLayersVisible.value

    console.log('切换KML图层显示状态:', kmlLayersVisible.value)

    // 通知地图组件更新KML图层显示状态
    if (mapRef.value) {
      if (kmlLayersVisible.value) {
        // 显示KML图层
        console.log('准备显示KML图层，文件数量:', window.allKmlFiles?.length || 0)
        if (window.allKmlFiles && window.allKmlFiles.length > 0) {
          // 先清除现有图层，避免重复
          mapRef.value.clearKmlLayers()
          mapRef.value.addKmlLayers(window.allKmlFiles)
        }
      } else {
        // 隐藏KML图层
        console.log('隐藏KML图层')
        mapRef.value.clearKmlLayers()
      }
    } else {
      console.warn('地图组件引用不存在，无法切换KML图层')
    }
  }

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
    showSettings,
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
    toggleKmlLayers
  }
}
