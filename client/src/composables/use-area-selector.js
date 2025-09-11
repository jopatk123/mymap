import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useKMLBaseMapStore } from '@/store/kml-basemap.js'

/**
 * 区域选择组合式函数
 */
export function useAreaSelector() {
  const store = useKMLBaseMapStore()
  
  // 当前模式：'circle'（圆形）、'polygon'（多边形）、null（无）
  const currentMode = ref(null)
  
  // 圆形区域相关
  const circleRadius = ref(1000) // 默认半径1000米
  const isDrawingCircle = ref(false)
  
  // 多边形区域相关
  const isDrawingPolygon = ref(false)
  const polygonPoints = ref([])
  const tempPolygonName = ref('')
  
  // 地图实例引用
  const mapInstance = ref(null)
  
  // 临时图层（用于显示正在绘制的图形）
  const tempLayers = ref([])
  // 持久图层（对应已保存的 store.areas），key = area.id
  const persistentLayers = ref({})

  // 在地图上渲染 store.areas
  const syncPersistentLayers = () => {
    try {
      if (!mapInstance.value || !window.L) return

      const existing = persistentLayers.value || {}
      const areaIds = new Set(store.areas.map(a => a.id))

      // 删除已移除的 areas 图层
      for (const id of Object.keys(existing)) {
        if (!areaIds.has(id)) {
          try { mapInstance.value.removeLayer(existing[id]) } catch (_) {}
          delete existing[id]
        }
      }

      // 添加或更新当前 areas
      for (const area of store.areas) {
        // 如果已经存在且可见处理可见性
        if (existing[area.id]) {
          const layer = existing[area.id]
          if (area.visible === false) {
            try { mapInstance.value.removeLayer(layer) } catch (_) {}
          } else {
            try { layer.addTo(mapInstance.value) } catch (_) {}
          }
          continue
        }

        // 创建新的 layer
        let layer = null
        if (area.type === 'circle' && window.L) {
          layer = window.L.circle([area.center.latitude, area.center.longitude], {
            radius: area.radius,
            color: 'blue',
            weight: 2,
            opacity: 0.6,
            fill: false
          })
        } else if (area.type === 'polygon' && window.L) {
          const latlngs = (area.polygon || []).map(p => [p.latitude, p.longitude])
          layer = window.L.polygon(latlngs, {
            color: 'blue',
            weight: 2,
            opacity: 0.7,
            fill: false
          })
        }

        if (layer) {
          try { layer.addTo(mapInstance.value) } catch (_) {}
          existing[area.id] = layer
        }
      }

      persistentLayers.value = existing
    } catch (err) {
      console.warn('[useAreaSelector] syncPersistentLayers error', err)
    }
  }

  // 监听 store.areas 与 mapInstance 变化以同步图层
  watch(() => store.areas, () => {
    syncPersistentLayers()
  }, { deep: true })

  watch(mapInstance, (v) => {
    if (v) syncPersistentLayers()
  })
  
  // 设置地图实例
  const setMapInstance = (map) => {
    // 兼容多种传入形式：直接leaflet map、组件暴露的对象、或ref
    try {
  // setMapInstance called
      if (!map) {
        mapInstance.value = null
        console.warn('[useAreaSelector] setMapInstance: received null/undefined')
        return
      }

      // 如果传入的是带有 clearMarkers/addPointMarkers 的工具对象（来自 marker-refresh），尝试从中提取真实 map
      if (map.clearMarkers && map.addPointMarkers) {
        // 这个对象可能就是一个工具对象，不能直接用于事件绑定。
        // 检查是否能从中读取底层 map（例如 map.map 或 mapInstance.map），否则只存储工具对象并记录。
        const maybeMap = map.map || map.mapInstance || map._map || map.leafletMap
        if (maybeMap && (maybeMap.on || maybeMap.getContainer)) {
          mapInstance.value = maybeMap
          // extracted underlying leaflet map from tool object
        } else {
          mapInstance.value = map
          // stored tool-like mapInstance
        }
        return
      }

      // 如果传入的是 Vue ref（例如组件暴露的 refs），尝试解包并优先取出底层 leaflet map
      if (map.value !== undefined) {
        // unwrap nested refs
        const candidate = map.value?.map ?? map.value
        // candidate 可能是一个封装对象或是直接的 Leaflet map
        if (candidate && (candidate.on || candidate.getContainer)) {
          mapInstance.value = candidate
          // unwrapped ref to leaflet map
        } else {
          mapInstance.value = candidate
          // unwrapped ref to non-leaflet candidate
        }
        return
      }

      // 其余情况直接赋值
      mapInstance.value = map
  // stored direct mapInstance
    } catch (err) {
      console.error('[useAreaSelector] setMapInstance error:', err)
      mapInstance.value = map
    }
  }
  
  // 开始圆形区域选择
  const startCircleSelection = () => {
    if (!mapInstance.value) {
      // 尝试回退到全局 window.mapInstance（由 initMap 设置）
      if (typeof window !== 'undefined' && window.mapInstance) {
    // falling back to window.mapInstance
        mapInstance.value = window.mapInstance
      }
    }

    if (!mapInstance.value) {
      ElMessage.error('地图未初始化')
      return
    }
    
    // debug info
  // startCircleSelection invoked

    currentMode.value = 'circle'
    isDrawingCircle.value = true

    ElMessage.info(`点击地图选择圆心位置，当前半径: ${circleRadius.value}米`)

    // 监听地图点击事件
    try {
      if (mapInstance.value.on) {
        mapInstance.value.on('click', handleCircleClick)
      } else {
        console.warn('[useAreaSelector] startCircleSelection: mapInstance has no .on method', mapInstance.value)
        ElMessage.error('地图对象不具备事件绑定方法 (on)，绘制功能可能不可用')
      }
    } catch (err) {
      console.error('[useAreaSelector] startCircleSelection bind error:', err)
      ElMessage.error('绑定地图点击事件失败')
    }

    // 改变鼠标样式（如果可能）
    try {
      if (mapInstance.value.getContainer) {
        mapInstance.value.getContainer().style.cursor = 'crosshair'
      } else if (mapInstance.value._container) {
        // Leaflet internals fallback
        mapInstance.value._container.style.cursor = 'crosshair'
      } else {
  // no getContainer/_container to set cursor
      }
    } catch (err) {
      console.warn('[useAreaSelector] unable to set cursor style:', err)
    }
  }
  
  // 处理圆形区域点击
  const handleCircleClick = (e) => {
    if (!isDrawingCircle.value) return
    
    const center = {
      latitude: e.latlng.lat,
      longitude: e.latlng.lng
    }
    
    // 添加圆形区域
    store.addCircleArea(center, circleRadius.value)
    
    // 在地图上绘制临时圆形覆盖层，便于用户预览
    try {
      if (window.L && mapInstance.value) {
        const circleLayer = window.L.circle([center.latitude, center.longitude], {
          radius: circleRadius.value,
          color: 'blue',
          weight: 2,
          opacity: 0.6,
          fill: false
        }).addTo(mapInstance.value)

        tempLayers.value.push(circleLayer)
      }
    } catch (err) {
      console.warn('[useAreaSelector] failed to draw preview circle:', err)
    }
    
    // 完成绘制
    completeCircleDrawing()
    
    ElMessage.success(`已添加圆形区域，半径 ${circleRadius.value}米`)
  }
  
  // 完成圆形绘制
  const completeCircleDrawing = () => {
    isDrawingCircle.value = false
    currentMode.value = null
    
  // 不立即清理临时图层，保留圆形以供查看
    if (mapInstance.value) {
      try { mapInstance.value.off('click', handleCircleClick) } catch (_) {}
      try {
        if (mapInstance.value.getContainer) mapInstance.value.getContainer().style.cursor = ''
        else if (mapInstance.value._container) mapInstance.value._container.style.cursor = ''
      } catch (_) {}
    }
  }
  
  // 开始多边形区域选择
  const startPolygonSelection = () => {
    if (!mapInstance.value) {
      // 尝试回退到全局 window.mapInstance
      if (typeof window !== 'undefined' && window.mapInstance) {
    // falling back to window.mapInstance
        mapInstance.value = window.mapInstance
      }
    }

    if (!mapInstance.value) {
      ElMessage.error('地图未初始化')
      return
    }
  // startPolygonSelection invoked

    currentMode.value = 'polygon'
    isDrawingPolygon.value = true
    polygonPoints.value = []

    ElMessage.info('点击地图绘制多边形区域，双击完成绘制')

    // 监听地图点击事件
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

    // 改变鼠标样式（如果可能）
    try {
      if (mapInstance.value.getContainer) {
        mapInstance.value.getContainer().style.cursor = 'crosshair'
      } else if (mapInstance.value._container) {
        mapInstance.value._container.style.cursor = 'crosshair'
      }
    } catch (err) {
      console.warn('[useAreaSelector] unable to set cursor style:', err)
    }
  }
  
  // 处理多边形点击
  const handlePolygonClick = (e) => {
    if (!isDrawingPolygon.value) return
    
    const point = {
      latitude: e.latlng.lat,
      longitude: e.latlng.lng
    }
    
    polygonPoints.value.push(point)
    
    // 绘制临时线条或多边形
    updateTempPolygon()
  }
  
  // 更新临时多边形显示
  const updateTempPolygon = () => {
    if (!mapInstance.value || polygonPoints.value.length < 2) return
    
    // 这里需要根据实际使用的地图库来实现
    // 例如使用Leaflet的情况下：
    clearTempLayers()
    
    const latlngs = polygonPoints.value.map(p => [p.latitude, p.longitude])
    
    if (window.L && mapInstance.value) {
      if (polygonPoints.value.length >= 3) {
        // 使用闭合的多边形进行预览
        const polygon = window.L.polygon(latlngs, {
          color: 'blue',
          weight: 2,
          opacity: 0.7,
          fill: false
        }).addTo(mapInstance.value)
        tempLayers.value.push(polygon)
      } else {
        const polyline = window.L.polyline(latlngs, {
          color: 'blue',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5'
        }).addTo(mapInstance.value)
        tempLayers.value.push(polyline)
      }
    }
  }
  
  // 完成多边形绘制
  const completePolygonDrawing = async () => {
    if (polygonPoints.value.length < 3) {
      ElMessage.warning('多边形至少需要3个点')
      return
    }
    // 自动生成名称并添加多边形区域（不再弹出输入框）
    try {
      const count = Array.isArray(store.areas) ? store.areas.length : 0
      const autoName = (tempPolygonName.value && tempPolygonName.value.trim())
        ? tempPolygonName.value.trim()
        : `自定义区域 ${count + 1}`

      store.addCustomArea(polygonPoints.value, autoName)
      ElMessage.success(`已添加自定义区域: ${autoName}`)
    } catch (err) {
      console.error('[useAreaSelector] addCustomArea failed', err)
      ElMessage.error('添加自定义区域失败')
    }

    // 清理状态
    finishPolygonDrawing()
  }
  
  // 结束多边形绘制
  const finishPolygonDrawing = () => {
    isDrawingPolygon.value = false
    currentMode.value = null
    polygonPoints.value = []
  // 不立即清理临时图层，保留已绘制的多边形直到用户选择“清除所有区域”或手动移除
    
    if (mapInstance.value) {
      mapInstance.value.off('click', handlePolygonClick)
      mapInstance.value.off('dblclick', completePolygonDrawing)
      mapInstance.value.getContainer().style.cursor = ''
    }
  }
  
  // 清除临时图层
  const clearTempLayers = () => {
    if (mapInstance.value && tempLayers.value.length > 0) {
      tempLayers.value.forEach(layer => {
        mapInstance.value.removeLayer(layer)
      })
      tempLayers.value = []
    }
  }
  
  // 取消当前绘制
  const cancelDrawing = () => {
    if (isDrawingCircle.value) {
      completeCircleDrawing()
    } else if (isDrawingPolygon.value) {
      finishPolygonDrawing()
    }
  // 清理临时图层
  try { clearTempLayers() } catch (err) { console.warn('[useAreaSelector] cancelDrawing: clearTempLayers failed', err) }
    
    ElMessage.info('已取消绘制')
  }

  // 完成绘制（由 UI 按钮调用）
  const finishDrawing = async () => {
    if (isDrawingPolygon.value) {
      // 触发与双击相同的完成逻辑
      await completePolygonDrawing()
      return
    }

    if (isDrawingCircle.value) {
      // 停止监听并保留已绘制圆
      completeCircleDrawing()
      return
    }
  }
  
  // 清除所有区域
  const clearAllAreas = async () => {
    if (store.areas.length === 0) {
      ElMessage.info('没有可清除的区域')
      return
    }
    
    try {
      await ElMessageBox.confirm(
        `确定要清除所有 ${store.areas.length} 个区域吗？`,
        '确认清除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      store.clearAllAreas()
      // 同时清理地图上的临时/已绘制图层
      try {
        clearTempLayers()
      } catch (err) {
        console.warn('[useAreaSelector] clearAllAreas: failed to clear temp layers', err)
      }
      ElMessage.success('已清除所有区域')
      
    } catch (error) {
      // 用户取消操作
    }
  }
  
  // 删除指定区域
  const removeArea = async (areaId, areaName) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除区域"${areaName}"吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      store.removeArea(areaId)
      ElMessage.success('区域删除成功')
      
    } catch (error) {
      // 用户取消操作
    }
  }
  
  // 设置圆形半径
  const setCircleRadius = (radius) => {
    if (radius > 0) {
      circleRadius.value = radius
    }
  }
  
  // 当前状态计算属性
  const isActive = computed(() => currentMode.value !== null)
  const isDrawing = computed(() => isDrawingCircle.value || isDrawingPolygon.value)
  
  return {
    // 状态
    currentMode,
    circleRadius,
    isDrawingCircle,
    isDrawingPolygon,
    polygonPoints,
    tempPolygonName,
    
    // 计算属性
    isActive,
    isDrawing,
    areas: computed(() => store.areas),
    areasCount: computed(() => store.areasCount),
    
    // 方法
    setMapInstance,
    startCircleSelection,
    startPolygonSelection,
  finishDrawing,
    cancelDrawing,
    clearAllAreas,
    removeArea,
    setCircleRadius
  }
}
