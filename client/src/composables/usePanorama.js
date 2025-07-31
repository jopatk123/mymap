import { ref, nextTick } from 'vue'

export function usePanorama() {
  const viewer = ref(null)
  const isViewerOpen = ref(false)
  const currentPanorama = ref(null)
  const isLoading = ref(false)
  
  // 初始化全景查看器
  const initViewer = async (containerId, panoramaUrl, options = {}) => {
    if (!window.pannellum) {
      console.error('Pannellum library not loaded')
      return null
    }
    
    const defaultOptions = {
      type: 'equirectangular',
      panorama: panoramaUrl,
      autoLoad: true,
      autoRotate: -2,
      compass: true,
      northOffset: 0,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      showControls: true,
      mouseZoom: true,
      doubleClickZoom: true,
      draggable: true,
      keyboardZoom: true,
      ...options
    }
    
    try {
      isLoading.value = true
      
      // 等待DOM更新
      await nextTick()
      
      viewer.value = window.pannellum.viewer(containerId, defaultOptions)
      
      // 添加事件监听
      setupViewerEvents()
      
      isLoading.value = false
      return viewer.value
    } catch (error) {
      console.error('初始化全景查看器失败:', error)
      isLoading.value = false
      return null
    }
  }
  
  // 设置查看器事件
  const setupViewerEvents = () => {
    if (!viewer.value) return
    
    viewer.value.on('load', () => {
      console.log('全景图加载完成')
      isLoading.value = false
    })
    
    viewer.value.on('error', (error) => {
      console.error('全景图加载错误:', error)
      isLoading.value = false
    })
    
    viewer.value.on('mousedown', () => {
      console.log('开始拖拽')
    })
    
    viewer.value.on('mouseup', () => {
      console.log('结束拖拽')
    })
  }
  
  // 打开全景图查看器
  const openViewer = async (panorama, containerId = 'panorama-viewer') => {
    currentPanorama.value = panorama
    isViewerOpen.value = true
    
    // 等待模态框打开后再初始化查看器
    await nextTick()
    
    if (panorama.imageUrl) {
      await initViewer(containerId, panorama.imageUrl)
    }
  }
  
  // 关闭全景图查看器
  const closeViewer = () => {
    if (viewer.value) {
      viewer.value.destroy()
      viewer.value = null
    }
    isViewerOpen.value = false
    currentPanorama.value = null
  }
  
  // 切换全景图
  const switchPanorama = async (panoramaUrl) => {
    if (!viewer.value) return
    
    try {
      isLoading.value = true
      viewer.value.loadScene(panoramaUrl)
    } catch (error) {
      console.error('切换全景图失败:', error)
      isLoading.value = false
    }
  }
  
  // 设置视角
  const setView = (pitch, yaw, hfov) => {
    if (!viewer.value) return
    
    viewer.value.setPitch(pitch || 0)
    viewer.value.setYaw(yaw || 0)
    if (hfov) {
      viewer.value.setHfov(hfov)
    }
  }
  
  // 获取当前视角
  const getView = () => {
    if (!viewer.value) return null
    
    return {
      pitch: viewer.value.getPitch(),
      yaw: viewer.value.getYaw(),
      hfov: viewer.value.getHfov()
    }
  }
  
  // 开始/停止自动旋转
  const toggleAutoRotate = (speed = -2) => {
    if (!viewer.value) return
    
    const currentSpeed = viewer.value.getConfig().autoRotate
    if (currentSpeed) {
      viewer.value.stopAutoRotate()
    } else {
      viewer.value.startAutoRotate(speed)
    }
  }
  
  // 全屏切换
  const toggleFullscreen = () => {
    if (!viewer.value) return
    
    if (viewer.value.isFullscreen()) {
      viewer.value.exitFullscreen()
    } else {
      viewer.value.requestFullscreen()
    }
  }
  
  // 添加热点
  const addHotspot = (hotspot) => {
    if (!viewer.value) return
    
    viewer.value.addHotSpot({
      id: hotspot.id,
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      type: hotspot.type || 'info',
      text: hotspot.text,
      clickHandlerFunc: hotspot.onClick || (() => {}),
      ...hotspot
    })
  }
  
  // 移除热点
  const removeHotspot = (hotspotId) => {
    if (!viewer.value) return
    
    viewer.value.removeHotSpot(hotspotId)
  }
  
  // 销毁查看器
  const destroyViewer = () => {
    if (viewer.value) {
      viewer.value.destroy()
      viewer.value = null
    }
  }
  
  return {
    viewer,
    isViewerOpen,
    currentPanorama,
    isLoading,
    initViewer,
    openViewer,
    closeViewer,
    switchPanorama,
    setView,
    getView,
    toggleAutoRotate,
    toggleFullscreen,
    addHotspot,
    removeHotspot,
    destroyViewer
  }
}