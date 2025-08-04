import { ElMessage } from 'element-plus'
import { usePanoramaStore } from '@/store/panorama.js'
import { useAppStore } from '@/store/app.js'

export function useMapInteractions(mapRef, selectedPanorama, showPanoramaModal, visiblePanoramas, currentPanorama) {
  const panoramaStore = usePanoramaStore()
  const appStore = useAppStore()

  // 处理全景图标记点击
  const handlePanoramaClick = (panorama) => {
    selectedPanorama.value = panorama
    panoramaStore.setCurrentPanorama(panorama)
    showPanoramaModal.value = true
  }

  // 处理地图点击
  const handleMapClick = (latlng) => {
    // 可以在这里添加新增全景图的逻辑
  }

  // 选择全景图
  const selectPanorama = (panorama) => {
    selectedPanorama.value = panorama
    panoramaStore.setCurrentPanorama(panorama)
    
    // 地图定位到该全景图（优先使用GCJ02坐标）
    if (mapRef.value) {
      const lat = panorama.gcj02Lat || panorama.lat
      const lng = panorama.gcj02Lng || panorama.lng
      mapRef.value.setCenter(lat, lng, 16)
    }
  }

  // 查看全景图
  const viewPanorama = (panorama) => {
    selectedPanorama.value = panorama
    showPanoramaModal.value = true
  }

  // 定位到全景图
  const locatePanorama = (panorama) => {
    if (mapRef.value) {
      // 优先使用GCJ02坐标
      const lat = panorama.gcj02Lat || panorama.lat
      const lng = panorama.gcj02Lng || panorama.lng
      mapRef.value.setCenter(lat, lng, 18)
    }
  }

  // 搜索处理
  const handleSearch = async (params) => {
    if (params.keyword.trim()) {
      panoramaStore.setSearchParams(params)
    } else {
      panoramaStore.clearSearchParams()
    }
    
    await panoramaStore.fetchPanoramas()
  }


  // 切换侧边栏
  const toggleSidebar = () => {
    appStore.toggleSidebar()
  }

  // 切换全景图列表显示/隐藏
  const togglePanoramaList = () => {
    appStore.togglePanoramaList()
  }

  // 上传成功处理
  const handleUploadSuccess = async () => {
    await panoramaStore.refresh()
    ElMessage.success('上传成功')
  }

  // 处理全景图删除
  const handlePanoramaDeleted = async (deletedId) => {
    try {
      // 从store中移除已删除的全景图
      await panoramaStore.deletePanoramaAsync(deletedId)
      
      // 重新加载地图标记
      if (mapRef.value) {
        mapRef.value.clearMarkers()
        mapRef.value.addPanoramaMarkers(visiblePanoramas.value)
      }
      
      // 清空选择状态
      if (currentPanorama.value?.id === deletedId) {
        panoramaStore.setCurrentPanorama(null)
      }
      if (selectedPanorama.value?.id === deletedId) {
        selectedPanorama.value = null
      }
      
      ElMessage.success('全景图已从地图中移除')
    } catch (error) {
      console.error('删除全景图后更新失败:', error)
      ElMessage.error('更新失败，请刷新页面')
    }
  }

  return {
    handlePanoramaClick,
    handleMapClick,
    selectPanorama,
    viewPanorama,
    locatePanorama,
    handleSearch,

    toggleSidebar,
    togglePanoramaList,
    handleUploadSuccess,
    handlePanoramaDeleted
  }
}