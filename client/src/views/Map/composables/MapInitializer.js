import { onMounted, onUnmounted } from 'vue'

export function useMapInitializer(
  loadAllPointStyles,
  videoPointStyles,
  panoramaPointStyles,
  initializePage,
  loadInitialData,
  handleFolderVisibilityChanged,
  handleKmlStylesUpdated,
  handlePointStylesUpdated
) {
  // 设置全局样式配置
  const setupGlobalStyles = () => {
    // 将样式配置存储到全局变量，供地图标记使用
    // 确保即使 API 调用失败，也有默认值
    window.videoPointStyles = videoPointStyles.value || {
      point_color: '#ff4757',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 14,
      point_label_color: '#000000'
    }
    window.panoramaPointStyles = panoramaPointStyles.value || {
      point_color: '#2ed573',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 12,
      point_label_color: '#000000'
    }
  }

  // 检查是否有配置更新需要处理
  const checkForConfigUpdates = async () => {
    const configUpdated = localStorage.getItem('configUpdated')
    if (configUpdated) {
      console.log('检测到配置更新，重新加载所有数据...')
      
      try {
        // 重新加载完整数据，包括点位和KML
        await loadInitialData()
        
        // 清除标记
        localStorage.removeItem('configUpdated')
        // 使用全局ElMessage，避免循环依赖
        if (window.ElMessage) {
          window.ElMessage.success('配置已保存并应用到地图')
        }
      } catch (error) {
        console.error('重新加载数据失败:', error)
        localStorage.removeItem('configUpdated')
        if (window.ElMessage) {
          window.ElMessage.warning('配置已保存，部分更新可能需要手动刷新')
        }
      }
    }
  }

  // 初始化地图页面
  const initializeMap = async () => {
    // 加载点位样式配置
    await loadAllPointStyles()
    
    // 设置全局样式
    setupGlobalStyles()
    
    // 初始化页面
    await initializePage()
    
    // 监听文件夹可见性变化事件
    window.addEventListener('folder-visibility-changed', handleFolderVisibilityChanged)
    
    // 检查是否有配置更新
    checkForConfigUpdates()
  }

  // 清理资源
  const cleanup = () => {
    window.removeEventListener('folder-visibility-changed', handleFolderVisibilityChanged)
  }

  // 设置生命周期钩子
  onMounted(async () => {
    await initializeMap()
  })

  onUnmounted(() => {
    cleanup()
  })

  // 在页面激活时检查配置更新
  const setupVisibilityChangeHandler = () => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForConfigUpdates()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 返回清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  return {
    initializeMap,
    cleanup,
    setupVisibilityChangeHandler,
    checkForConfigUpdates
  }
}