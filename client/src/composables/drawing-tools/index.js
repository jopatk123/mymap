import { ref, computed } from 'vue'
import L from 'leaflet'

// 工具状态管理
const activeTool = ref(null)
const drawings = ref([])
let mapInstance = null
let currentEventHandlers = {}

export function useDrawingTools() {
  // 计算属性
  const hasDrawings = computed(() => drawings.value.length > 0)

  // 初始化工具
  const initializeTools = (map) => {
    console.log('初始化绘图工具', map, 'type:', typeof map)
    if (!map) {
      console.warn('地图实例为空，无法初始化绘图工具')
      return
    }
    
    mapInstance = map
    
    // 确保地图有绘图图层组
    if (!map.drawingLayerGroup) {
      console.log('创建绘图图层组')
      map.drawingLayerGroup = L.layerGroup().addTo(map)
    } else {
      console.log('绘图图层组已存在')
    }
    
    console.log('绘图工具初始化完成')
  }

  // 激活工具
  const activateTool = (toolType, map) => {
    console.log('激活工具:', toolType)
    
    // 先清理之前的事件监听器（这会处理之前工具的拖拽状态）
    cleanupEventHandlers()
    
    // 设置当前工具
    activeTool.value = toolType
    mapInstance = map
    
    if (!map) {
      console.error('地图实例不存在')
      return
    }
    
    // 对于非画笔工具，确保地图拖拽是启用的
    if (toolType !== 'draw') {
      console.log('启用地图拖拽（非画笔工具）')
      map.dragging.enable()
    }
    
    // 根据工具类型设置相应的事件监听器
    switch (toolType) {
      case 'measure':
        setupMeasureTool()
        break
      case 'point':
        setupPointTool()
        break
      case 'line':
        setupLineTool()
        break
      case 'polygon':
        setupPolygonTool()
        break
      case 'draw':
        setupDrawTool()
        break
    }
    
    // 设置光标样式
    map.getContainer().style.cursor = 'crosshair'
  }

  // 停用工具
  const deactivateTool = () => {
    console.log('停用工具, 当前激活:', activeTool.value)
    
    // 如果当前是画笔工具，重新启用地图拖拽
    if (activeTool.value === 'draw' && mapInstance) {
      console.log('重新启用地图拖拽')
      mapInstance.dragging.enable()
    }
    
    // 清理事件监听器
    cleanupEventHandlers()
    
    // 重置光标
    if (mapInstance) {
      mapInstance.getContainer().style.cursor = ''
    }
    
    activeTool.value = null
  }

  // 清理事件监听器
  const cleanupEventHandlers = () => {
    if (!mapInstance) return
    
    // 如果当前是画笔工具，确保重新启用地图拖拽
    if (activeTool.value === 'draw') {
      console.log('清理画笔工具，重新启用地图拖拽')
      mapInstance.dragging.enable()
    }
    
    Object.keys(currentEventHandlers).forEach(eventType => {
      if (currentEventHandlers[eventType]) {
        mapInstance.off(eventType, currentEventHandlers[eventType])
      }
    })
    
    currentEventHandlers = {}
  }

  // 测距工具
  const setupMeasureTool = () => {
    console.log('设置测距工具')
    let isDrawing = false
    let points = []
    let polyline = null
    let totalDistance = 0
    
    const handleClick = (e) => {
      console.log('测距工具点击:', e.latlng)
      
      if (!isDrawing) {
        // 开始测距
        isDrawing = true
        points = [e.latlng]
        totalDistance = 0
        
        // 创建测距线
        polyline = L.polyline([e.latlng], {
          color: '#ff0000',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        }).addTo(mapInstance.drawingLayerGroup)
        
        // 添加起点标记
        const startMarker = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'measure-marker',
            html: '<div style="background: rgba(0,128,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">起点</div>',
            iconSize: [40, 20],
            iconAnchor: [20, 10]
          })
        }).addTo(mapInstance.drawingLayerGroup)
        
      } else {
        // 继续测距
        const lastPoint = points[points.length - 1]
        const segmentDistance = lastPoint.distanceTo(e.latlng)
        totalDistance += segmentDistance
        
        points.push(e.latlng)
        polyline.addLatLng(e.latlng)
        
        // 添加距离标记
        const distanceText = totalDistance < 1000 
          ? Math.round(totalDistance) + 'm' 
          : (totalDistance / 1000).toFixed(2) + 'km'
          
        const distanceMarker = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'measure-marker',
            html: `<div style="background: rgba(255,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${distanceText}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          })
        }).addTo(mapInstance.drawingLayerGroup)
      }
    }
    
    const handleDoubleClick = (e) => {
      if (isDrawing) {
        console.log('测距完成')
        isDrawing = false
        
        // 保存测距结果
        drawings.value.push({
          type: 'measure',
          data: { points, distance: totalDistance, polyline },
          id: Date.now()
        })
      }
    }
    
    currentEventHandlers.click = handleClick
    currentEventHandlers.dblclick = handleDoubleClick
    
    mapInstance.on('click', handleClick)
    mapInstance.on('dblclick', handleDoubleClick)
  }

  // 添加点工具
  const setupPointTool = () => {
    console.log('设置添加点工具')
    
    const handleClick = (e) => {
      console.log('添加点:', e.latlng)
      
      const marker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'drawing-point-marker',
          html: '<div style="font-size: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">📍</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapInstance.drawingLayerGroup)
      
      // 保存点位数据
      drawings.value.push({
        type: 'point',
        data: { latlng: e.latlng, marker },
        id: Date.now()
      })
    }
    
    currentEventHandlers.click = handleClick
    mapInstance.on('click', handleClick)
  }

  // 添加线工具
  const setupLineTool = () => {
    console.log('设置添加线工具')
    let isDrawing = false
    let points = []
    let polyline = null
    
    const handleClick = (e) => {
      console.log('绘制线:', e.latlng)
      
      if (!isDrawing) {
        // 开始画线
        isDrawing = true
        points = [e.latlng]
        
        polyline = L.polyline([e.latlng], {
          color: '#0066ff',
          weight: 3,
          opacity: 0.8
        }).addTo(mapInstance.drawingLayerGroup)
        
      } else {
        // 继续画线
        points.push(e.latlng)
        polyline.addLatLng(e.latlng)
      }
    }
    
    const handleDoubleClick = (e) => {
      if (isDrawing) {
        console.log('线条绘制完成')
        isDrawing = false
        
        // 保存线条数据
        drawings.value.push({
          type: 'line',
          data: { points, polyline },
          id: Date.now()
        })
      }
    }
    
    currentEventHandlers.click = handleClick
    currentEventHandlers.dblclick = handleDoubleClick
    
    mapInstance.on('click', handleClick)
    mapInstance.on('dblclick', handleDoubleClick)
  }

  // 添加面工具
  const setupPolygonTool = () => {
    console.log('设置添加面工具')
    let isDrawing = false
    let points = []
    let polygon = null
    
    const handleClick = (e) => {
      console.log('绘制多边形:', e.latlng)
      
      if (!isDrawing) {
        // 开始画面
        isDrawing = true
        points = [e.latlng]
        
        polygon = L.polygon([e.latlng], {
          color: '#00ff00',
          weight: 2,
          opacity: 0.8,
          fillColor: '#00ff00',
          fillOpacity: 0.3
        }).addTo(mapInstance.drawingLayerGroup)
        
      } else {
        // 继续画面
        points.push(e.latlng)
        polygon.setLatLngs([...points])
      }
    }
    
    const handleDoubleClick = (e) => {
      if (isDrawing && points.length >= 3) {
        console.log('多边形绘制完成')
        isDrawing = false
        
        // 保存多边形数据
        drawings.value.push({
          type: 'polygon',
          data: { points, polygon },
          id: Date.now()
        })
      }
    }
    
    currentEventHandlers.click = handleClick
    currentEventHandlers.dblclick = handleDoubleClick
    
    mapInstance.on('click', handleClick)
    mapInstance.on('dblclick', handleDoubleClick)
  }

  // 画笔工具
  const setupDrawTool = () => {
    console.log('设置画笔工具')
    
    // 禁用地图拖拽
    console.log('禁用地图拖拽')
    mapInstance.dragging.disable()
    
    let isDrawing = false
    let points = []
    let polyline = null
    
    const handleMouseDown = (e) => {
      console.log('开始自由绘制')
      isDrawing = true
      points = [e.latlng]
      
      polyline = L.polyline([e.latlng], {
        color: '#ff6600',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(mapInstance.drawingLayerGroup)
      
      // 阻止事件冒泡，防止触发地图的默认行为
      e.originalEvent?.preventDefault()
      e.originalEvent?.stopPropagation()
    }
    
    const handleMouseMove = (e) => {
      if (isDrawing && polyline) {
        points.push(e.latlng)
        polyline.addLatLng(e.latlng)
        
        // 阻止事件冒泡
        e.originalEvent?.preventDefault()
        e.originalEvent?.stopPropagation()
      }
    }
    
    const handleMouseUp = (e) => {
      if (isDrawing) {
        console.log('自由绘制完成')
        isDrawing = false
        
        // 保存绘制数据
        drawings.value.push({
          type: 'draw',
          data: { points, polyline },
          id: Date.now()
        })
        
        // 阻止事件冒泡
        e.originalEvent?.preventDefault()
        e.originalEvent?.stopPropagation()
      }
    }
    
    currentEventHandlers.mousedown = handleMouseDown
    currentEventHandlers.mousemove = handleMouseMove
    currentEventHandlers.mouseup = handleMouseUp
    
    mapInstance.on('mousedown', handleMouseDown)
    mapInstance.on('mousemove', handleMouseMove)  
    mapInstance.on('mouseup', handleMouseUp)
  }

  // 清除所有绘图
  const clearAllDrawings = () => {
    return new Promise((resolve) => {
      console.log('清除所有绘图')
      
      if (mapInstance && mapInstance.drawingLayerGroup) {
        mapInstance.drawingLayerGroup.clearLayers()
      }
      
      drawings.value = []
      deactivateTool()
      resolve()
    })
  }

  // 导出绘图数据
  const exportDrawings = (format) => {
    return new Promise((resolve, reject) => {
      console.log('导出数据:', format)
      if (drawings.value.length === 0) {
        reject(new Error('没有可导出的数据'))
        return
      }
      
      // 临时实现：创建一个简单的文本文件
      const data = `绘图数据导出 (${format} 格式)\n导出时间: ${new Date().toLocaleString()}\n数据数量: ${drawings.value.length}`
      const blob = new Blob([data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `drawings_${Date.now()}.${format}`
      link.click()
      URL.revokeObjectURL(url)
      resolve()
    })
  }

  return {
    // 状态
    activeTool,
    hasDrawings,
    drawings,
    
    // 方法
    initializeTools,
    activateTool,
    deactivateTool,
    clearAllDrawings,
    exportDrawings
  }
}