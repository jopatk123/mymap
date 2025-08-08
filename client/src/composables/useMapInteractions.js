import { ElMessage } from 'element-plus'
import { usePanoramaStore } from '@/store/panorama.js'
import { useAppStore } from '@/store/app.js'

export function useMapInteractions(mapRef, selectedPanorama, showPanoramaModal, visiblePanoramas, currentPanorama, selectedVideo, showVideoModal, showPanoramaViewer, openPanoramaViewer) {
  const panoramaStore = usePanoramaStore()
  const appStore = useAppStore()

  // 处理点位标记点击（区分全景图和视频点位）
  const handlePanoramaClick = (point) => {
    // 根据点位类型判断是全景图还是视频点位
    if (point.type === 'video' || point.videoUrl) {
      // 视频点位 - 直接打开视频播放器
      selectedVideo.value = point
      showVideoModal.value = true
    } else {
      // 全景图点位 - 直接打开全景图查看器
      selectedPanorama.value = point
      panoramaStore.setCurrentPanorama(point)
      // 直接打开全景图查看器，不显示信息模态框
      viewPanorama(point)
    }
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
      
      // 验证坐标是否有效
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        mapRef.value.setCenter(lat, lng, 16)
      } else {
        console.warn('无效的坐标数据:', { panorama, lat, lng })
      }
    }
  }

  // 查看全景图 - 直接打开全景图查看器
  const viewPanorama = (panorama) => {
    selectedPanorama.value = panorama
    panoramaStore.setCurrentPanorama(panorama)
    showPanoramaViewer.value = true
    openPanoramaViewer(panorama)
  }

  // 查看视频 - 打开视频播放器
  const viewVideo = (video) => {
    selectedVideo.value = video
    showVideoModal.value = true
  }

  // 定位到全景图
  const locatePanorama = (panorama) => {
    if (mapRef.value) {
      // 优先使用GCJ02坐标
      const lat = panorama.gcj02Lat || panorama.lat
      const lng = panorama.gcj02Lng || panorama.lng
      
      // 验证坐标是否有效
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        mapRef.value.setCenter(lat, lng, 18)
      } else {
        console.warn('无效的坐标数据:', { panorama, lat, lng })
      }
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
    // 同时刷新store数据和全局点位数据
    await Promise.all([
      panoramaStore.refresh(),
      // 重新加载全局点位数据
      (async () => {
        try {
          const { pointsApi } = await import('@/api/points.js')
          const response = await pointsApi.getAllPoints({
            respectFolderVisibility: true
          })
          
          const allPoints = response.data || []
          const filteredPoints = allPoints.filter(point => {
            if (point.type === 'kml') return false
            const lat = point.lat || point.latitude
            const lng = point.lng || point.longitude
            return lat != null && lng != null && !isNaN(lat) && !isNaN(lng)
          })
          
          window.allPoints = filteredPoints
          console.log('🔄 上传成功后更新全局点位数据:', filteredPoints.length)
        } catch (error) {
          console.error('更新全局点位数据失败:', error)
        }
      })()
    ])
    
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
    viewVideo,
    locatePanorama,
    handleSearch,

    toggleSidebar,
    togglePanoramaList,
    handleUploadSuccess,
    handlePanoramaDeleted
  }
}