import { ref, computed, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { usePanoramaStore } from '@/store/panorama.js'
import { useAppStore } from '@/store/app.js'
import { pointsApi } from '@/api/points.js'

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
      // 同时加载全景图和所有点位数据
      await Promise.all([
        panoramaStore.fetchPanoramas(),
        loadAllPoints()
      ])
      // 数据加载完成后自动适应所有标记点并初始化KML图层
      setTimeout(() => {
        if (mapRef.value) {
          mapRef.value.fitBounds()
          // 如果KML图层应该显示，则主动加载KML图层
          if (kmlLayersVisible.value && window.allKmlFiles && window.allKmlFiles.length > 0) {
            console.log('初始化时加载KML图层，文件数量:', window.allKmlFiles.length)
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
      // 并行加载点位数据和KML文件数据
      const [pointsResponse, kmlResponse] = await Promise.all([
        pointsApi.getAllPoints({
          pageSize: 1000,
          respectFolderVisibility: true // 考虑文件夹可见性
        }),
        pointsApi.getVisibleKmlFiles({
          respectFolderVisibility: true // 考虑文件夹可见性
        })
      ])

      // 只保留有坐标的点位（全景图和视频点位）
      const filteredPoints = pointsResponse.data.filter(point =>
        point.type !== 'kml' && point.lat != null && point.lng != null
      )

      // 将点位数据存储到全局状态中，供地图组件使用
      window.allPoints = filteredPoints || []

      // 将KML文件数据存储到全局状态中，供地图组件使用
      window.allKmlFiles = kmlResponse.data || []

      console.log('加载数据完成:', {
        points: window.allPoints.length,
        kmlFiles: window.allKmlFiles.length
      })
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

    // 方法
    initializePage,
    loadInitialData,
    loadMore,
    toggleKmlLayers
  }
}