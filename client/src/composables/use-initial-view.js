import { ref, onMounted } from 'vue'
import { initialViewApi } from '../api/initial-view.js'

export function useInitialView() {
  const initialViewSettings = ref({
    enabled: false,
    center: [116.4074, 39.9042],
    zoom: 12
  })
  
  const loading = ref(false)

  // 加载初始显示设置
  const loadInitialViewSettings = async () => {
    loading.value = true
    try {
      const response = await initialViewApi.getSettings()
      if (response.success) {
        initialViewSettings.value = response.data
      }
    } catch (error) {
      console.warn('加载初始显示设置失败，使用默认设置:', error)
      // 使用默认设置，不抛出错误以免影响地图加载
    } finally {
      loading.value = false
    }
  }

  // 获取地图初始化配置
  const getMapConfig = () => {
    const settings = initialViewSettings.value
    
    if (settings.enabled && settings.center && settings.zoom) {
      // 返回自定义的初始显示设置
      // 注意：center 格式需要转换为 [lat, lng] 格式，因为 Leaflet 使用这种格式
      return {
        center: [settings.center[1], settings.center[0]], // [lat, lng] 格式
        zoom: settings.zoom
      }
    }
    
    // 返回默认设置
    return {
      center: [39.9042, 116.4074], // 默认北京 [lat, lng] 格式
      zoom: 12
    }
  }

  // 在组件挂载时自动加载设置
  onMounted(() => {
    loadInitialViewSettings()
  })

  return {
    initialViewSettings,
    loading,
    loadInitialViewSettings,
    getMapConfig
  }
}