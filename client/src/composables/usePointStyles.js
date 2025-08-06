import { ref } from 'vue'
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
    point_size: 10,
    point_opacity: 1.0,
    point_icon_type: 'marker',
    point_label_size: 12,
    point_label_color: '#000000'
  })

  // 初始化本地存储缓存
  const initLocalCache = () => {
    try {
      const cached = localStorage.getItem('pointStyles')
      if (cached) {
        const styles = JSON.parse(cached)
        if (styles.video) videoPointStyles.value = styles.video
        if (styles.panorama) panoramaPointStyles.value = styles.panorama
      }
    } catch (error) {
      console.warn('读取本地样式缓存失败:', error)
    }
  }

  // 保存到本地存储
  const saveToLocalCache = () => {
    try {
      const styles = {
        video: videoPointStyles.value,
        panorama: panoramaPointStyles.value,
        lastUpdated: Date.now()
      }
      localStorage.setItem('pointStyles', JSON.stringify(styles))
    } catch (error) {
      console.warn('保存本地样式缓存失败:', error)
    }
  }

  // 初始化本地存储缓存
  initLocalCache()

  // 加载视频点位样式
  const loadVideoPointStyles = async (useCache = true) => {
    try {
      // 检查本地缓存
      if (useCache) {
        const cached = localStorage.getItem('pointStyles')
        if (cached) {
          const styles = JSON.parse(cached)
          const cacheAge = Date.now() - (styles.lastUpdated || 0)
          // 缓存有效期为1小时
          if (cacheAge < 3600000 && styles.video) {
            videoPointStyles.value = styles.video
            return styles.video
          }
        }
      }

      loading.value = true
      const response = await videoPointStyleApi.getStyles()
      videoPointStyles.value = response.data
      saveToLocalCache()
      return response.data
    } catch (error) {
      console.error('加载视频点位样式失败:', error)
      return videoPointStyles.value // 返回默认样式
    } finally {
      loading.value = false
    }
  }

  // 加载全景图点位样式
  const loadPanoramaPointStyles = async (useCache = true) => {
    try {
      // 检查本地缓存
      if (useCache) {
        const cached = localStorage.getItem('pointStyles')
        if (cached) {
          const styles = JSON.parse(cached)
          const cacheAge = Date.now() - (styles.lastUpdated || 0)
          if (cacheAge < 3600000 && styles.panorama) {
            panoramaPointStyles.value = styles.panorama
            return styles.panorama
          }
        }
      }

      loading.value = true
      const response = await panoramaPointStyleApi.getStyles()
      panoramaPointStyles.value = response.data
      saveToLocalCache()
      return response.data
    } catch (error) {
      console.error('加载全景图点位样式失败:', error)
      return panoramaPointStyles.value
    } finally {
      loading.value = false
    }
  }

  // 加载所有点位样式
  const loadAllPointStyles = async (useCache = true) => {
    try {
      loading.value = true
      await Promise.all([
        loadVideoPointStyles(useCache),
        loadPanoramaPointStyles(useCache)
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
      saveToLocalCache()
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
      saveToLocalCache()
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
    updatePanoramaPointStyles,
    clearCache: () => {
      localStorage.removeItem('pointStyles')
    }
  }
}