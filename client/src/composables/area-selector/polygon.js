// 多边形绘制相关逻辑
import { ElMessage } from 'element-plus'
import { gcj02ToWgs84, wgs84ToGcj02 } from '@/utils/coordinate-transform.js'

export function createPolygonActions(context) {
  const { currentMode, isDrawingPolygon, polygonPoints, tempPolygonName, mapInstance, tempLayers, store } = context

  const startPolygonSelection = () => {
    if (!mapInstance.value && typeof window !== 'undefined' && window.mapInstance) {
      mapInstance.value = window.mapInstance
    }
    if (!mapInstance.value) {
      ElMessage.error('地图未初始化')
      return
    }
    currentMode.value = 'polygon'
    isDrawingPolygon.value = true
    polygonPoints.value = []
    ElMessage.info('点击地图绘制多边形区域，双击完成绘制')
    try {
      if (mapInstance.value.on) {
        mapInstance.value.on('click', handlePolygonClick)
        mapInstance.value.on('dblclick', completePolygonDrawing)
      } else {
        console.warn('[useAreaSelector] startPolygonSelection: mapInstance has no .on method', mapInstance.value)
        ElMessage.error('地图对象不具备事件绑定方法 (on)，绘制功能可能不可用')
      }
    } catch (err) {
      console.error('[useAreaSelector] startPolygonSelection bind error:', err)
      ElMessage.error('绑定地图点击事件失败')
    }
    try {
      const container = mapInstance.value.getContainer?.() || mapInstance.value._container
      if (container) container.style.cursor = 'crosshair'
    } catch (_) {}
  }

  const handlePolygonClick = (e) => {
    if (!isDrawingPolygon.value) return
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat)
    polygonPoints.value.push({ latitude: wgsLat, longitude: wgsLng })
    updateTempPolygon()
  }

  const updateTempPolygon = () => {
    if (!mapInstance.value || polygonPoints.value.length < 2) return
    clearTempLayers()
    const latlngs = polygonPoints.value.map(p => {
      try { const [gcjLng, gcjLat] = wgs84ToGcj02(p.longitude, p.latitude); return [gcjLat, gcjLng] } catch { return [p.latitude, p.longitude] }
    })
    if (window.L && mapInstance.value) {
      if (polygonPoints.value.length >= 3) {
        const polygon = window.L.polygon(latlngs, { color: 'blue', weight: 2, opacity: 0.7, fill: false }).addTo(mapInstance.value)
        tempLayers.value.push(polygon)
      } else {
        const polyline = window.L.polyline(latlngs, { color: 'blue', weight: 2, opacity: 0.7, dashArray: '5, 5' }).addTo(mapInstance.value)
        tempLayers.value.push(polyline)
      }
    }
  }

  const completePolygonDrawing = async () => {
    if (polygonPoints.value.length < 3) {
      ElMessage.warning('多边形至少需要3个点')
      return
    }
    try {
      const count = Array.isArray(store.areas) ? store.areas.length : 0
      const autoName = (tempPolygonName.value && tempPolygonName.value.trim()) ? tempPolygonName.value.trim() : `自定义区域 ${count + 1}`
      store.addCustomArea(polygonPoints.value, autoName)
      ElMessage.success(`已添加自定义区域: ${autoName}`)
    } catch (err) {
      console.error('[useAreaSelector] addCustomArea failed', err)
      ElMessage.error('添加自定义区域失败')
    }
    finishPolygonDrawing()
  }

  const finishPolygonDrawing = () => {
    isDrawingPolygon.value = false
    currentMode.value = null
    polygonPoints.value = []
    if (mapInstance.value) {
      try { mapInstance.value.off('click', handlePolygonClick) } catch (_) {}
      try { mapInstance.value.off('dblclick', completePolygonDrawing) } catch (_) {}
      try { (mapInstance.value.getContainer?.() || mapInstance.value._container).style.cursor = '' } catch (_) {}
    }
  }

  const clearTempLayers = () => {
    if (mapInstance.value && tempLayers.value.length > 0) {
      tempLayers.value.forEach(layer => { try { mapInstance.value.removeLayer(layer) } catch (_) {} })
      tempLayers.value = []
    }
  }

  return {
    startPolygonSelection,
    handlePolygonClick,
    updateTempPolygon,
    completePolygonDrawing,
    finishPolygonDrawing,
    clearTempLayers
  }
}
