import { ref, reactive } from 'vue'
import { videoPointStyleApi, panoramaPointStyleApi } from '@/api/pointStyle.js'

export function usePointStyles() {
  const loading = ref(false)
  
  // 样式配置缓存
  const videoPointStyles = ref({
    point_color: '#ff4757',
    point_size: 10,
    point_opacity: 1.0,
    point_icon_type: 'marker',
    point_label_size: 14,
    point_label_color: '#000000'
  })
  
  const panoramaPointStyles = ref({
    point_color: '#2ed573',
    point_size: 8,
    point_opacity: 1.0,
    point_icon_type: 'circle',
    point_label_size: 12,
    point_label_color: '#000000'
  })

  // 加载视频点位样式
  const loadVideoPointStyles = async () => {
    try {
      loading.value = true
      const response = await videoPointStyleApi.getStyles()
      videoPointStyles.value = response.data
      return response.data
    } catch (error) {
      console.error('加载视频点位样式失败:', error)
      return videoPointStyles.value // 返回默认样式
    } finally {
      loading.value = false
    }
  }

  // 加载全景图点位样式
  const loadPanoramaPointStyles = async () => {
    try {
      loading.value = true
      const response = await panoramaPointStyleApi.getStyles()
      panoramaPointStyles.value = response.data
      return response.data
    } catch (error) {
      console.error('加载全景图点位样式失败:', error)
      return panoramaPointStyles.value // 返回默认样式
    } finally {
      loading.value = false
    }
  }

  // 加载所有点位样式
  const loadAllPointStyles = async () => {
    try {
      loading.value = true
      await Promise.all([
        loadVideoPointStyles(),
        loadPanoramaPointStyles()
      ])
    } catch (error) {
      console.error('加载点位样式失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取指定类型的样式配置
  const getPointStyles = (type) => {
    switch (type) {
      case 'video':
        return videoPointStyles.value
      case 'panorama':
      default:
        return panoramaPointStyles.value
    }
  }

  // 更新视频点位样式
  const updateVideoPointStyles = async (styleConfig) => {
    try {
      const response = await videoPointStyleApi.updateStyles(styleConfig)
      videoPointStyles.value = response.data
      return response.data
    } catch (error) {
      console.error('更新视频点位样式失败:', error)
      throw error
    }
  }

  // 更新全景图点位样式
  const updatePanoramaPointStyles = async (styleConfig) => {
    try {
      const response = await panoramaPointStyleApi.updateStyles(styleConfig)
      panoramaPointStyles.value = response.data
      return response.data
    } catch (error) {
      console.error('更新全景图点位样式失败:', error)
      throw error
    }
  }

  return {
    loading,
    videoPointStyles,
    panoramaPointStyles,
    loadVideoPointStyles,
    loadPanoramaPointStyles,
    loadAllPointStyles,
    getPointStyles,
    updateVideoPointStyles,
    updatePanoramaPointStyles
  }
}