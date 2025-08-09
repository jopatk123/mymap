import { ElMessage } from 'element-plus'
import { kmlApi } from '@/api/kml-files.js'

export function useMapEventHandlers(
  mapRef,
  kmlLayersVisible,
  loadAllPointStyles,
  videoPointStyles,
  panoramaPointStyles,
  loadInitialData
) {
  // 处理文件夹可见性变化
  const handleFolderVisibilityChanged = async () => {
    await loadInitialData()
    
    // 重新加载数据后，如果KML图层应该显示，则重新加载KML图层
    setTimeout(() => {
      if (mapRef.value && kmlLayersVisible.value) {
        mapRef.value.clearKmlLayers()
        if (window.allKmlFiles && window.allKmlFiles.length > 0) {
          mapRef.value.addKmlLayers(window.allKmlFiles)
        }
      }
    }, 600)
  }

  // 处理KML样式更新
  const handleKmlStylesUpdated = async () => {
    if (mapRef.value && kmlLayersVisible.value) {
      try {
        // 添加短暂延迟，确保服务器配置已保存完成
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 重新获取所有KML文件及其样式
        const kmlResponse = await kmlApi.getKmlFiles({
          respectFolderVisibility: true,
          _t: new Date().getTime()
        })
        
        const kmlFilesWithStyles = await Promise.all(
          (kmlResponse.data || []).map(async (file) => {
            try {
              // 重试机制，最多重试3次
              let retryCount = 0
              const maxRetries = 3
              let lastError = null
              
              while (retryCount < maxRetries) {
                try {
                  const styleResponse = await kmlApi.getKmlFileStyles(file.id)
                  file.styleConfig = styleResponse.data
                  return file
                } catch (error) {
                  lastError = error
                  retryCount++
                  if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 200 * retryCount))
                  }
                }
              }
              
              // 使用默认样式
              file.styleConfig = {
                point_color: "#ff7800",
                point_size: 8,
                point_opacity: 1,
                point_icon_type: "marker",
                point_label_size: 12,
                point_label_color: "#000000",
                line_color: "#ff7800",
                line_width: 2,
                line_opacity: 0.8,
                line_style: "solid",
                polygon_fill_color: "#ff7800",
                polygon_fill_opacity: 0.3,
                polygon_stroke_color: "#ff7800",
                polygon_stroke_width: 2,
                polygon_stroke_style: "solid"
              }
            } catch (error) {
              file.styleConfig = null
            }
            return file
          })
        )
        
        // 更新全局变量
        window.allKmlFiles = kmlFilesWithStyles
        
        mapRef.value.clearKmlLayers()
        
        // 使用setTimeout确保DOM更新完成
        setTimeout(() => {
          mapRef.value.addKmlLayers(kmlFilesWithStyles)
        }, 100)
        
      } catch (error) {
        console.error('重新加载KML图层失败:', error)
        ElMessage.error('重新加载KML图层失败')
      }
    }
  }

  // 处理点位样式更新
  const handlePointStylesUpdated = async () => {
    try {
      // 重新加载点位样式配置
      await loadAllPointStyles()
      
      // 更新全局变量
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
      
      // 点位样式更新时，只重新加载现有KML图层，不重新获取样式
      if (kmlLayersVisible.value && window.allKmlFiles && window.allKmlFiles.length > 0) {
        try {
          // 重新加载现有的KML图层
          if (mapRef.value) {
            mapRef.value.clearKmlLayers()
            setTimeout(() => {
              mapRef.value.addKmlLayers(window.allKmlFiles)
            }, 200)
          }
        } catch (error) {
          console.error('重新加载KML图层失败:', error)
        }
      }
      
      // 使用标记刷新工具更新点位样式
      try {
        const { refreshAllMarkers } = await import('@/utils/marker-refresh.js')
        const success = refreshAllMarkers()
        
        if (success) {
          ElMessage.success('点位样式已更新')
          return
        }
      } catch (refreshError) {
      }
      
      // 回退方法：清除并重新加载标记
      if (mapRef.value) {
        mapRef.value.clearMarkers()
        
        // 延迟重新加载，确保清除完成
        setTimeout(async () => {
          try {
            await loadInitialData()
            ElMessage.success('点位样式已更新')
          } catch (error) {
            console.error('重新加载数据失败:', error)
          }
        }, 300)
      }
      
    } catch (error) {
      console.error('更新点位样式失败:', error)
      ElMessage.error('应用点位样式失败')
    }
  }

  return {
    handleFolderVisibilityChanged,
    handleKmlStylesUpdated,
    handlePointStylesUpdated
  }
}