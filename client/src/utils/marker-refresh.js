/**
 * 标记刷新工具 - 简化版本
 *
 * 说明：此模块负责在全局 `window.allPoints` 改变时刷新地图上的标记。
 * 它通过 `setMapInstance` 注册一个包含 `clearMarkers` 和 `addPointMarkers` 的对象，
 * 并在 `refreshAllMarkers` 中调用这些方法。
 */

let mapInstanceData = null

export function setMapInstance(data) {
  mapInstanceData = data
  try { if (typeof window !== 'undefined') { window._markerRefreshMapInstance = mapInstanceData } } catch(e){}
}

export function setMarkersData(markers) {
  // 保持兼容性，但不做复杂验证
}

export function refreshAllMarkers() {
  if (!mapInstanceData || !mapInstanceData.clearMarkers || !mapInstanceData.addPointMarkers) {
    return false
  }

  try {
    // 先清除现有标记（无论 currentPoints 是否为空，都要清理遗留标记）
    mapInstanceData.clearMarkers()
  } catch (err) {
    // 不要因为清除失败阻塞后续操作
    try { console.warn('[marker-refresh] clearMarkers failed', err) } catch(e){}
  }

  const currentPoints = window.allPoints || []

  // 没有点时仅完成清除工作
  if (currentPoints.length === 0) {
    try { console.debug && console.debug('[marker-refresh] refreshAllMarkers: no points to add, cleared existing markers') } catch(e){}
    return true
  }

  // 重新添加标记
  setTimeout(() => {
    try { mapInstanceData.addPointMarkers(currentPoints) } catch (err) { try { console.warn('[marker-refresh] addPointMarkers failed', err) } catch(e){} }
  }, 100)

  return true
}

// 兼容性：暴露到window
if (typeof window !== 'undefined') {
  window.refreshAllMarkers = refreshAllMarkers
}