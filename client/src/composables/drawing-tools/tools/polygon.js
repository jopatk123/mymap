import L from 'leaflet'
import { dlog } from '../utils/debug.js'

export function createPolygonTool(mapInstance, drawings, register) {
  dlog('设置添加面工具')
  let isDrawing = false
  let points = []
  let polygon = null

  const handleClick = (e) => {
    // 防止在点击已有面积时触发绘制
    if (e.originalEvent && e.originalEvent.target && 
        e.originalEvent.target.closest('.interactive-polygon')) {
      return
    }

    dlog('绘制多边形:', e.latlng)
    if (!isDrawing) {
      isDrawing = true
      points = [e.latlng]
      polygon = L.polygon([e.latlng], {
        color: '#3388ff',
        weight: 3,
        opacity: 1.0,
        fillColor: '#3388ff',
        fillOpacity: 0.2
      }).addTo(mapInstance.drawingLayerGroup)
    } else {
      points.push(e.latlng)
      polygon.setLatLngs([...points])
    }
  }

  const handleDoubleClick = (e) => {
    // 防止在点击已有面积时触发完成绘制
    if (e.originalEvent && e.originalEvent.target && 
        e.originalEvent.target.closest('.interactive-polygon')) {
      return
    }

    if (isDrawing && points.length >= 3) {
      dlog('多边形绘制完成')
      isDrawing = false
      
      const polygonIndex = drawings.value.filter((d) => d.type === 'polygon').length + 1
      const polygonId = `polygon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 计算面积和周长
      const area = calculateArea(points)
      const perimeter = calculatePerimeter(points)
      
      // 创建面积数据
      const polygonData = {
        type: 'polygon',
        id: polygonId,
        name: `区域${polygonIndex}`,
        description: '',
        latlngs: points,
        color: '#3388ff',
        fillColor: '#3388ff',
        weight: 3,
        opacity: 1.0,
        fillOpacity: 0.2,
        dashArray: null,
        area: area,
        perimeter: perimeter,
        timestamp: new Date(),
        properties: {}
      }
      
      // 移除临时绘制的面积
      mapInstance.drawingLayerGroup.removeLayer(polygon)
      
      // 创建新的交互式面积
      const interactivePolygon = L.polygon(points, {
        color: polygonData.color,
        fillColor: polygonData.fillColor,
        weight: polygonData.weight,
        opacity: polygonData.opacity,
        fillOpacity: polygonData.fillOpacity,
        className: 'interactive-polygon',
        polygonId: polygonId
      }).addTo(mapInstance.drawingLayerGroup)
      
      // 存储polygon引用到面积数据中
      polygonData.polygon = interactivePolygon
      
      // 设置面积事件
      setupPolygonEvents(interactivePolygon, polygonData, drawings, mapInstance)
      
      // 添加到绘图数组
      drawings.value.push(polygonData)
      
      dlog('面积已添加:', polygonData)
      
      // 重置状态
      points = []
      polygon = null
    }
  }

  register({ click: handleClick, dblclick: handleDoubleClick })
}

// 计算面积 (平方米)
function calculateArea(latlngs) {
  if (latlngs.length < 3) return 0
  
  // 使用鞋带公式计算面积（近似值）
  const R = 6378137 // 地球半径（米）
  
  let area = 0
  const coords = latlngs.map(ll => [ll.lat * Math.PI / 180, ll.lng * Math.PI / 180])
  
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    area += coords[i][1] * Math.sin(coords[j][0])
    area -= coords[j][1] * Math.sin(coords[i][0])
  }
  
  area = Math.abs(area) * R * R / 2
  return area
}

// 计算周长 (米)
function calculatePerimeter(latlngs) {
  if (latlngs.length < 2) return 0
  
  let perimeter = 0
  for (let i = 0; i < latlngs.length; i++) {
    const j = (i + 1) % latlngs.length
    perimeter += L.latLng(latlngs[i]).distanceTo(L.latLng(latlngs[j]))
  }
  return perimeter
}

// 设置面积事件
function setupPolygonEvents(polygon, polygonData, drawings, mapInstance) {
  // 左键点击事件 - 显示信息弹窗
  polygon.on('click', (e) => {
    dlog('点击面积:', polygonData.name)
    L.DomEvent.stopPropagation(e)
    
    // 触发自定义事件，由DrawingToolbar组件监听
    mapInstance.fire('polygon:click', {
      polygon: polygonData,
      latlng: e.latlng,
      containerPoint: e.containerPoint
    })
  })
  
  // 右键点击事件 - 显示上下文菜单
  polygon.on('contextmenu', (e) => {
    dlog('右键点击面积:', polygonData.name)
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)
    
    // 获取屏幕坐标
    const containerPoint = e.containerPoint
    const mapContainer = mapInstance.getContainer()
    const mapRect = mapContainer.getBoundingClientRect()
    
    // 触发自定义事件
    mapInstance.fire('polygon:contextmenu', {
      polygon: polygonData,
      position: {
        x: mapRect.left + containerPoint.x,
        y: mapRect.top + containerPoint.y
      }
    })
  })
  
  // 鼠标悬停效果
  polygon.on('mouseover', () => {
    polygon.setStyle({
      weight: (polygonData.weight || 3) + 2,
      opacity: Math.min((polygonData.opacity || 1.0) + 0.1, 1),
      fillOpacity: Math.min((polygonData.fillOpacity || 0.2) + 0.1, 0.5)
    })
  })
  
  polygon.on('mouseout', () => {
    polygon.setStyle({
      weight: polygonData.weight || 3,
      opacity: polygonData.opacity || 1.0,
      fillOpacity: polygonData.fillOpacity || 0.2
    })
  })
}

// 更新面积样式
export function updatePolygonStyle(polygon, polygonData) {
  if (!polygon || !polygonData) return
  
  polygon.setStyle({
    color: polygonData.color || '#3388ff',
    fillColor: polygonData.fillColor || '#3388ff',
    weight: polygonData.weight || 3,
    opacity: polygonData.opacity || 1.0,
    fillOpacity: polygonData.fillOpacity || 0.2,
    dashArray: polygonData.dashArray || null
  })
}
