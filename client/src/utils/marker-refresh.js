/**
 * 标记刷新工具 - 简化版本
 */

let mapInstanceData = null

export function setMapInstance(data) {
  mapInstanceData = data
}

export function setMarkersData(markers) {
  // 保持兼容性，但不做复杂验证
}

export function refreshAllMarkers() {
  if (!mapInstanceData || !mapInstanceData.clearMarkers || !mapInstanceData.addPointMarkers) {
    return false
  }
  
  const currentPoints = window.allPoints || []
  if (currentPoints.length === 0) {
    return true
  }
  
  // 清除现有标记
  mapInstanceData.clearMarkers()
  
  // 重新添加标记
  setTimeout(() => {
    mapInstanceData.addPointMarkers(currentPoints)
  }, 100)
  
  return true
}

// 兼容性：暴露到window
if (typeof window !== 'undefined') {
  window.refreshAllMarkers = refreshAllMarkers
}