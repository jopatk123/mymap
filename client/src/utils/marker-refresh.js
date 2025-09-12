/**
 * 标记刷新工具
 * 用于在样式更新后刷新地图上的所有标记
 */

// 存储地图实例和相关方法
let mapInstanceData = null

/**
 * 设置地图实例数据
 * @param {Object} data 包含地图实例和相关方法的对象
 */
export function setMapInstance(data) {
  mapInstanceData = data
}

/**
 * 设置标记数据
 * @param {Array} markers 标记数据数组
 */
export function setMarkersData(markers) {
  // 验证标记数据的有效性
  if (markers && markers.length > 0) {
    // 简单的坐标验证，避免动态导入
    const invalidMarkers = markers.filter(marker => {
      const lat = marker.lat || marker.latitude
      const lng = marker.lng || marker.longitude
  return lat == null || lng == null || isNaN(lat) || isNaN(lng)
    })
    
    if (invalidMarkers.length > 0) {
      console.warn(`发现 ${invalidMarkers.length} 个无效的标记数据`, invalidMarkers)
    }
  }
}

/**
 * 刷新所有地图标记
 * @returns {boolean} 是否成功刷新
 */
export function refreshAllMarkers() {
  try {
    // 优先使用设置的地图实例数据
    if (mapInstanceData && mapInstanceData.clearMarkers && mapInstanceData.addPointMarkers) {
      
      // 获取当前点位数据
      const currentPoints = window.allPoints || []
      if (currentPoints.length === 0) {
        return true
      }

      // 清除现有标记（保护：只在函数存在时调用）
      try { console.debug('[marker-refresh] using mapInstanceData to refresh markers, points:', currentPoints.length) } catch(e){}
      try { mapInstanceData.clearMarkers && mapInstanceData.clearMarkers() } catch (e) { console.warn('[marker-refresh] clearMarkers failed', e) }

      // 重新添加标记（延迟以避免与 Leaflet 动画/聚簇冲突）
      setTimeout(() => {
        try {
          mapInstanceData.addPointMarkers && mapInstanceData.addPointMarkers(currentPoints)
        } catch (e) {
          console.warn('[marker-refresh] addPointMarkers failed', e)
        }
      }, 500)
      
      return true
    }

    // 回退到原来的方法
    const mapInstance = window.mapInstance
    if (!mapInstance) {
      console.warn('地图实例不存在')
      return false
    }

    // 获取当前标记数据
    const currentMarkers = window.currentMarkers || []
    if (currentMarkers.length === 0) {
      return true
    }

    // 清除现有标记
    try { console.debug('[marker-refresh] clearing existing markers, count:', currentMarkers.length) } catch(e){}
    currentMarkers.forEach(markerInfo => {
      try {
        if (markerInfo.marker && mapInstance && mapInstance.removeLayer) {
          mapInstance.removeLayer(markerInfo.marker)
        }
      } catch (err) {
        console.warn('[marker-refresh] removeLayer failed for', markerInfo.id, err)
      }
    })

    // 重新创建标记
    const { createPointMarker } = require('./map-utils.js')
    const newMarkers = []

  currentMarkers.forEach(markerInfo => {
      try {
        const { data, type } = markerInfo
    if (!data || (data.lat == null && data.latitude == null) || (data.lng == null && data.longitude == null)) {
          console.warn('标记数据不完整，跳过:', markerInfo.id)
          return
        }

        // 获取坐标
        let displayLat = data.lat || data.latitude
        let displayLng = data.lng || data.longitude

        // 优先使用GCJ02坐标
        if (data.gcj02Lat && data.gcj02Lng) {
          displayLat = data.gcj02Lat
          displayLng = data.gcj02Lng
        } else if (data.gcj02_lat && data.gcj02_lng) {
          displayLat = data.gcj02_lat
          displayLng = data.gcj02_lng
        }

  // 创建新标记
  const newMarker = createPointMarker([displayLat, displayLng], type, {
          title: data.title || (type === 'video' ? '视频点位' : '全景图'),
        }, null)

        // 重新绑定事件
        if (window.mapMarkerClickHandler) {
          newMarker.on('click', () => {
            window.mapMarkerClickHandler(data)
          })
        }

  try { newMarker.addTo(mapInstance) } catch (e) { console.warn('[marker-refresh] newMarker.addTo failed', e) }
        newMarkers.push({
          id: data.id,
          marker: newMarker,
          type: type,
          data: data
        })

      } catch (error) {
        console.warn('重建标记失败:', markerInfo.id, error)
      }
    })

  // 更新全局标记数组
  window.currentMarkers = newMarkers

  } catch (error) {
    console.error('刷新标记失败:', error)
    return false
  }
}

/**
 * 刷新指定类型的标记
 * @param {string} type 标记类型 'video' | 'panorama'
 * @returns {boolean} 是否成功刷新
 */
export function refreshMarkersByType(type) {
  try {
    const mapInstance = window.mapInstance
    if (!mapInstance) {
      console.warn('地图实例不存在')
      return false
    }

    const currentMarkers = window.currentMarkers || []
    const typeMarkers = currentMarkers.filter(m => m.type === type)
    
    if (typeMarkers.length === 0) {
      return true
    }

    // 清除指定类型的标记
    typeMarkers.forEach(markerInfo => {
      if (markerInfo.marker && mapInstance) {
        mapInstance.removeLayer(markerInfo.marker)
      }
    })

    // 从全局数组中移除
    window.currentMarkers = currentMarkers.filter(m => m.type !== type)

    // 重新创建指定类型的标记
    const { createPointMarker } = require('./map-utils.js')
    const newMarkers = []

    typeMarkers.forEach(markerInfo => {
      try {
        const { data } = markerInfo
        if (!data || !data.lat || !data.lng) {
          console.warn('标记数据不完整，跳过:', markerInfo.id)
          return
        }

        // 获取坐标
        let displayLat = data.lat || data.latitude
        let displayLng = data.lng || data.longitude

        // 优先使用GCJ02坐标
        if (data.gcj02Lat && data.gcj02Lng) {
          displayLat = data.gcj02Lat
          displayLng = data.gcj02Lng
        } else if (data.gcj02_lat && data.gcj02_lng) {
          displayLat = data.gcj02_lat
          displayLng = data.gcj02_lng
        }

        // 创建新标记
        const newMarker = createPointMarker([displayLat, displayLng], type, {
          title: data.title || (type === 'video' ? '视频点位' : '全景图'),
        }, null)

        // 重新绑定事件
        if (window.mapMarkerClickHandler) {
          newMarker.on('click', () => {
            window.mapMarkerClickHandler(data)
          })
        }

        newMarker.addTo(mapInstance)
        newMarkers.push({
          id: data.id,
          marker: newMarker,
          type: type,
          data: data
        })

      } catch (error) {
        console.warn('重建标记失败:', markerInfo.id, error)
      }
    })

    // 将新标记添加到全局数组
    window.currentMarkers.push(...newMarkers)
    
    return true

  } catch (error) {
    console.error(`刷新 ${type} 标记失败:`, error)
    return false
  }
}