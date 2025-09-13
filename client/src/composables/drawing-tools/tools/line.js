import L from 'leaflet'
import { dlog } from '../utils/debug.js'

export function createLineTool(mapInstance, drawings, register, onCleanup) {
  dlog('设置添加线工具')
  let isDrawing = false
  let points = []
  let polyline = null

  const handleClick = (e) => {
    // 防止在点击已有线段时触发绘制
    if (e.originalEvent && e.originalEvent.target && 
        e.originalEvent.target.closest('.interactive-line')) {
      dlog('[line] click blocked by existing interactive line')
      return
    }

    dlog('[line] handleClick, isDrawing=', isDrawing, 'latlng=', e.latlng)
    if (!isDrawing) {
      isDrawing = true
      points = [e.latlng]
      polyline = L.polyline([e.latlng], { color: '#3388ff', weight: 3, opacity: 0.8 }).addTo(
        mapInstance.drawingLayerGroup
      )
  dlog('[line] started drawing, temp polyline created')
    } else {
      points.push(e.latlng)
      polyline.addLatLng(e.latlng)
  dlog('[line] added point, total points:', points.length)
    }
  }

  const handleDoubleClick = (e) => {
    // 防止在点击已有线段时触发完成绘制
    if (e.originalEvent && e.originalEvent.target && 
        e.originalEvent.target.closest('.interactive-line')) {
      dlog('[line] dblclick blocked by existing interactive line')
      return
    }
    dlog('[line] handleDoubleClick, isDrawing=', isDrawing, 'points.length=', points.length)
    if (isDrawing && points.length >= 2) {
      dlog('[line] finishing drawing with', points.length, 'points')
      dlog('线条绘制完成')
      isDrawing = false
      
      const lineIndex = drawings.value.filter((d) => d.type === 'line').length + 1
      const lineId = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 计算线段长度
      const distance = calculateDistance(points)
      
      // 创建线段数据
      const lineData = {
        type: 'line',
        id: lineId,
        name: `线段${lineIndex}`,
        description: '',
        latlngs: points,
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
        dashArray: null,
        distance: distance,
        timestamp: new Date(),
        properties: {}
      }
      
      // 移除临时绘制的线段
      mapInstance.drawingLayerGroup.removeLayer(polyline)
      
      // 创建新的交互式线段
      const interactivePolyline = L.polyline(points, {
        color: lineData.color,
        weight: lineData.weight,
        opacity: lineData.opacity,
        // 确保可以接收鼠标事件并允许事件向上传播到 map
        interactive: true,
        bubblingMouseEvents: true,
        className: 'interactive-line',
        lineId: lineId
      }).addTo(mapInstance.drawingLayerGroup)
      
  // 存储polyline引用到线段数据中
  lineData.polyline = interactivePolyline
  dlog('[line] interactive polyline created:', lineId)
      
  // 设置线段事件
  setupLineEvents(interactivePolyline, lineData, drawings, mapInstance)
      
      // 添加到绘图数组
      drawings.value.push(lineData)
      
  dlog('线段已添加:', lineData)
      
      // 重置状态
      points = []
      polyline = null
    }
  }

  // 右键完成绘制
  const handleRightClick = (e) => {
    if (isDrawing && points.length >= 2) {
  dlog('[line] right click to finish drawing')
      // 调用完成绘制逻辑，复用 handleDoubleClick 的逻辑
      handleDoubleClick(e)
    }
  }

  // 完成当前绘制的函数（供外部调用）
  const finishCurrentDrawing = () => {
    if (isDrawing && points.length >= 2) {
  dlog('[line] finishing current drawing due to tool switch')
      // 创建一个模拟事件来完成绘制
      handleDoubleClick({ originalEvent: null })
    }
  }

  // 注册清理函数，在工具切换时完成当前绘制
  if (onCleanup) {
    onCleanup(finishCurrentDrawing)
  }

  register({ 
    click: handleClick, 
    dblclick: handleDoubleClick,
    contextmenu: handleRightClick 
  })
}

// 计算线段距离
function calculateDistance(latlngs) {
  let distance = 0
  for (let i = 1; i < latlngs.length; i++) {
    distance += L.latLng(latlngs[i-1]).distanceTo(L.latLng(latlngs[i]))
  }
  return distance
}

// 设置线段事件
function setupLineEvents(polyline, lineData, drawings, mapInstance) {
  // 左键点击事件 - 显示信息弹窗
  polyline.on('click', (e) => {
  dlog('[line] click handler fired for:', lineData && lineData.name)
  dlog('点击线段:', lineData.name)
    L.DomEvent.stopPropagation(e)
    
    // 触发自定义事件，由DrawingToolbar组件监听
    mapInstance.fire('line:click', {
      line: lineData,
      latlng: e.latlng,
      containerPoint: e.containerPoint
    })
  })
  
  // 右键点击事件 - 显示上下文菜单
  polyline.on('contextmenu', (e) => {
    dlog('[line] contextmenu handler fired for:', lineData && lineData.name)
    dlog('右键点击线段:', lineData.name)
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)
    
    // 获取屏幕坐标
    const containerPoint = e.containerPoint
    const mapContainer = mapInstance.getContainer()
    const mapRect = mapContainer.getBoundingClientRect()
    
    // 触发自定义事件
    mapInstance.fire('line:contextmenu', {
      line: lineData,
      position: {
        x: mapRect.left + containerPoint.x,
        y: mapRect.top + containerPoint.y
      }
    })
  })
  
  // 鼠标悬停效果
  polyline.on('mouseover', () => {
    polyline.setStyle({
      weight: (lineData.weight || 3) + 2,
      opacity: Math.min((lineData.opacity || 0.8) + 0.2, 1)
    })
  })
  
  polyline.on('mouseout', () => {
    polyline.setStyle({
      weight: lineData.weight || 3,
      opacity: lineData.opacity || 0.8
    })
  })
}

// 更新线段样式
export function updateLineStyle(polyline, lineData) {
  if (!polyline || !lineData) return
  
  polyline.setStyle({
    color: lineData.color || '#3388ff',
    weight: lineData.weight || 3,
    opacity: lineData.opacity || 0.8,
    dashArray: lineData.dashArray || null
  })
}
