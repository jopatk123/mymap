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
  const showPanoramaModal = ref(false)
  const showUploadDialog = ref(false)
  const showSettings = ref(false)

  // 计算属性
  const totalCount = computed(() => pagination.value.total)

  // 初始化
  const initializePage = async () => {
    // 初始化应用
    appStore.initApp()
    
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
      // 数据加载完成后自动适应所有标记点
      setTimeout(() => {
        if (mapRef.value) {
          mapRef.value.fitBounds()
        }
      }, 500)
    } catch (error) {
      ElMessage.error('加载数据失败: ' + error.message)
    }
  }

  // 加载所有点位数据
  const loadAllPoints = async () => {
    try {
      const response = await pointsApi.getAllPoints({ pageSize: 1000 })
      // 将点位数据存储到全局状态中，供地图组件使用
      window.allPoints = response.data || []
    } catch (error) {
      console.error('加载点位数据失败:', error)
      window.allPoints = []
    }
  }

  // 加载更多
  const loadMore = async () => {
    await panoramaStore.loadMore()
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
    showPanoramaModal,
    showUploadDialog,
    showSettings,
    
    // 方法
    initializePage,
    loadInitialData,
    loadMore
  }
}