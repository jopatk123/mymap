import { ref, computed } from 'vue'
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
  
  // 设置地图实例
  const setMapInstance = (map) => {
    mapInstance.value = map
  }
  
  // 开始圆形区域选择
  const startCircleSelection = () => {
    if (!mapInstance.value) {
      ElMessage.error('地图未初始化')
      return
    }
    
    currentMode.value = 'circle'
    isDrawingCircle.value = true
    
    ElMessage.info(`点击地图选择圆心位置，当前半径: ${circleRadius.value}米`)
    
    // 监听地图点击事件
    mapInstance.value.on('click', handleCircleClick)
    
    // 改变鼠标样式
    mapInstance.value.getContainer().style.cursor = 'crosshair'
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
    
    // 完成绘制
    completeCircleDrawing()
    
    ElMessage.success(`已添加圆形区域，半径 ${circleRadius.value}米`)
  }
  
  // 完成圆形绘制
  const completeCircleDrawing = () => {
    isDrawingCircle.value = false
    currentMode.value = null
    
    if (mapInstance.value) {
      mapInstance.value.off('click', handleCircleClick)
      mapInstance.value.getContainer().style.cursor = ''
    }
  }
  
  // 开始多边形区域选择
  const startPolygonSelection = () => {
    if (!mapInstance.value) {
      ElMessage.error('地图未初始化')
      return
    }
    
    currentMode.value = 'polygon'
    isDrawingPolygon.value = true
    polygonPoints.value = []
    
    ElMessage.info('点击地图绘制多边形区域，双击完成绘制')
    
    // 监听地图点击事件
    mapInstance.value.on('click', handlePolygonClick)
    mapInstance.value.on('dblclick', completePolygonDrawing)
    
    // 改变鼠标样式
    mapInstance.value.getContainer().style.cursor = 'crosshair'
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
      const polyline = window.L.polyline(latlngs, {
        color: 'blue',
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5'
      }).addTo(mapInstance.value)
      
      tempLayers.value.push(polyline)
    }
  }
  
  // 完成多边形绘制
  const completePolygonDrawing = async () => {
    if (polygonPoints.value.length < 3) {
      ElMessage.warning('多边形至少需要3个点')
      return
    }
    
    // 提示输入区域名称
    try {
      const { value: name } = await ElMessageBox.prompt(
        '请输入区域名称',
        '自定义区域',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: tempPolygonName.value || '自定义区域'
        }
      )
      
      // 添加多边形区域
      store.addCustomArea(polygonPoints.value, name || '自定义区域')
      
      ElMessage.success(`已添加自定义区域: ${name}`)
      
    } catch (error) {
      if (error !== 'cancel') {
        // 即使取消了也要添加区域，只是使用默认名称
        store.addCustomArea(polygonPoints.value, '自定义区域')
        ElMessage.success('已添加自定义区域')
      }
    }
    
    // 清理状态
    finishPolygonDrawing()
  }
  
  // 结束多边形绘制
  const finishPolygonDrawing = () => {
    isDrawingPolygon.value = false
    currentMode.value = null
    polygonPoints.value = []
    
    clearTempLayers()
    
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
    
    ElMessage.info('已取消绘制')
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
    cancelDrawing,
    clearAllAreas,
    removeArea,
    setCircleRadius
  }
}
