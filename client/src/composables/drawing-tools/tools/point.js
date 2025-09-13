import L from 'leaflet'
import { dlog } from '../utils/debug.js'

export function createPointTool(mapInstance, drawings, register) {
  dlog('设置添加点工具')
  
  const handleClick = (e) => {
    // 防止在点击已有标记时重复添加
    if (e.originalEvent && e.originalEvent.target && 
        e.originalEvent.target.closest('.drawing-point-marker')) {
      return
    }
    
    dlog('添加点:', e.latlng)
    
    const pointIndex = drawings.value.filter((d) => d.type === 'point').length + 1
    const pointId = `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 创建点位数据
    const pointData = {
      type: 'point',
      id: pointId,
      name: `点位${pointIndex}`,
      description: '',
      latlng: e.latlng,
      icon: '📍',
      color: '#409eff',
      size: 24,
      timestamp: new Date(),
      properties: {}
    }
    
    // 创建标记
    const marker = L.marker(e.latlng, {
      icon: createPointIcon(pointData),
      pointId: pointId, // 存储点位ID用于后续查找
      riseOnHover: true
    }).addTo(mapInstance.drawingLayerGroup)
    
    // 存储marker引用到点位数据中
    pointData.marker = marker
    
    // 设置标记事件
    setupMarkerEvents(marker, pointData, drawings, mapInstance)
    
    // 添加到绘图数组
    drawings.value.push(pointData)
    
    dlog('点位已添加:', pointData)
  }

  register({ click: handleClick })
}

// 创建点位图标
function createPointIcon(pointData) {
  const size = pointData.size || 24
  return L.divIcon({
    className: 'drawing-point-marker interactive-point',
    html: `<div style="
      font-size: ${size}px; 
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s ease;
    " data-point-id="${pointData.id}">${pointData.icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

// 设置标记事件
function setupMarkerEvents(marker, pointData, drawings, mapInstance) {
  // 左键点击事件 - 显示信息弹窗
  marker.on('click', (e) => {
    dlog('点击点位:', pointData.name)
    L.DomEvent.stopPropagation(e)
    
    // 触发自定义事件，由DrawingToolbar组件监听
    mapInstance.fire('point:click', {
      point: pointData,
      latlng: e.latlng,
      containerPoint: e.containerPoint
    })
  })
  
  // 右键点击事件 - 显示上下文菜单
  marker.on('contextmenu', (e) => {
    dlog('右键点击点位:', pointData.name)
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)
    
    // 获取屏幕坐标
    const containerPoint = e.containerPoint
    const mapContainer = mapInstance.getContainer()
    const mapRect = mapContainer.getBoundingClientRect()
    
    // 触发自定义事件
    mapInstance.fire('point:contextmenu', {
      point: pointData,
      position: {
        x: mapRect.left + containerPoint.x,
        y: mapRect.top + containerPoint.y
      }
    })
  })
  
  // 鼠标悬停效果
  marker.on('mouseover', () => {
    const icon = marker.getElement()
    if (icon) {
      const iconDiv = icon.querySelector('div')
      if (iconDiv) {
        iconDiv.style.transform = 'scale(1.2)'
      }
    }
  })
  
  marker.on('mouseout', () => {
    const icon = marker.getElement()
    if (icon) {
      const iconDiv = icon.querySelector('div')
      if (iconDiv) {
        iconDiv.style.transform = 'scale(1)'
      }
    }
  })
}

// 导出辅助函数供其他模块使用
export { createPointIcon, setupMarkerEvents }
