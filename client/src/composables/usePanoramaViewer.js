import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { usePanorama } from '@/composables/usePanorama.js'

export function usePanoramaViewer() {
  const viewerVisible = ref(false)
  const autoRotating = ref(false)
  
  const {
    viewer,
    isLoading,
    initViewer,
    closeViewer: closePanoramaViewer,
    toggleAutoRotate: togglePanoramaAutoRotate,
    toggleFullscreen: togglePanoramaFullscreen,
    setView
  } = usePanorama()
  
  // 打开全景图查看器
  const openViewer = async (panorama) => {
    if (!panorama?.imageUrl) {
      ElMessage.error('全景图地址不存在')
      console.error('全景图数据缺失:', panorama)
      return
    }
    
    // 检查图片URL是否有效
    const imageUrl = panorama.imageUrl
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      ElMessage.error('全景图地址格式不正确')
      console.error('无效的图片URL:', imageUrl)
      return
    }
    
    viewerVisible.value = true
    
    // 等待DOM渲染完成后初始化查看器 - 增加延迟确保容器完全渲染
    setTimeout(async () => {
      try {
        const viewer = await initViewer('panorama-viewer', imageUrl)
        autoRotating.value = true
      } catch (error) {
        console.error('初始化全景图查看器失败:', error)
        ElMessage.error('加载全景图失败，请检查图片地址')
      }
    }, 500) // 增加延迟时间
  }
  
  // 关闭全景图查看器
  const closeViewer = () => {
    closePanoramaViewer()
    viewerVisible.value = false
    autoRotating.value = false
  }
  
  // 切换自动旋转
  const toggleAutoRotate = () => {
    togglePanoramaAutoRotate()
    autoRotating.value = !autoRotating.value
  }
  
  // 切换全屏
  const toggleFullscreen = () => {
    togglePanoramaFullscreen()
  }
  
  // 重置视角
  const resetView = () => {
    setView(0, 0, 75)
  }
  
  return {
    // 状态
    viewerVisible,
    autoRotating,
    isLoading,
    
    // 方法
    openViewer,
    closeViewer,
    toggleAutoRotate,
    toggleFullscreen,
    resetView
  }
}