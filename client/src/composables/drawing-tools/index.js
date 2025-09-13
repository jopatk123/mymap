import { ref, computed } from 'vue'
import L from 'leaflet'
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js'

/**
 * 绘图工具 composable
 *
 * 坐标策略说明（维护者）：
 * - 在带有高德/GCJ-02 瓦片的场景中，地图显示坐标与部分流程中使用的坐标被视为 GCJ-02。
 * - 导出（KML/GeoJSON/CSV）时，需将这些被视为 GCJ-02 的坐标转换为 WGS84 写入文件，保证导出文件的通用性。
 * - 本模块在生成导出文件时会调用 `gcj02ToWgs84` 做该转换（若需变更策略，请在此处与 coordinate-transform 模块同步修改）。
 */

// 调试开关：上线时设为 false；开发时可临时打开
const DEBUG = false
function dlog(...args) {
  if (DEBUG) console.log(...args)
}

// 假设当前存储/显示坐标为 GCJ-02 （如高德瓦片场景），导出前将其转换为 WGS84

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
    dlog('初始化绘图工具', map, 'type:', typeof map)
    if (!map) {
      console.warn('地图实例为空，无法初始化绘图工具')
      return
    }

    mapInstance = map

    // 确保地图有绘图图层组
    if (!map.drawingLayerGroup) {
      dlog('创建绘图图层组')
      map.drawingLayerGroup = L.layerGroup().addTo(map)
    } else {
      dlog('绘图图层组已存在')
    }

    dlog('绘图工具初始化完成')
  }

  const activateTool = (toolType, map) => {
    dlog('激活工具:', toolType)

    cleanupEventHandlers()

    activeTool.value = toolType
    mapInstance = map

    if (!map) {
      console.error('地图实例不存在')
      return
    }

    // 对于非画笔工具，确保地图拖拽是启用的
    if (toolType !== 'draw') {
      dlog('启用地图拖拽(非画笔工具)')
      map.dragging.enable()
    }

    // 根据工具类型设置事件
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
    dlog('停用工具, 当前激活:', activeTool.value)

    // 如果当前是画笔工具，重新启用地图拖拽
    if (activeTool.value === 'draw' && mapInstance) {
      dlog('重新启用地图拖拽')
      mapInstance.dragging.enable()
    }

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
      dlog('清理画笔工具，重新启用地图拖拽')
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
    dlog('设置测距工具')
    let isDrawing = false
    let points = []
    let polyline = null
    let totalDistance = 0

    const handleClick = (e) => {
      dlog('测距工具点击:', e.latlng)

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
        dlog('测距完成')
        isDrawing = false
        
        // 保存测距结果
        const measureIndex = drawings.value.filter(d => d.type === 'measure').length + 1
        drawings.value.push({
          type: 'measure',
          name: `测距${measureIndex}`,
          data: { points, distance: totalDistance, polyline },
          id: Date.now(),
          timestamp: new Date()
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
    dlog('设置添加点工具')

    const handleClick = (e) => {
      dlog('添加点:', e.latlng)

      const marker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'drawing-point-marker',
          html: '<div style="font-size: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">📍</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapInstance.drawingLayerGroup)

      // 保存点位数据
      const pointIndex = drawings.value.filter(d => d.type === 'point').length + 1
      drawings.value.push({
        type: 'point',
        name: `点位${pointIndex}`,
        data: { latlng: e.latlng, marker },
        id: Date.now(),
        timestamp: new Date()
      })
    }

    currentEventHandlers.click = handleClick
    mapInstance.on('click', handleClick)
  }

  // 添加线工具
  const setupLineTool = () => {
    dlog('设置添加线工具')
    let isDrawing = false
    let points = []
    let polyline = null

    const handleClick = (e) => {
      dlog('绘制线:', e.latlng)

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
        dlog('线条绘制完成')
        isDrawing = false
        
        // 保存线条数据
        const lineIndex = drawings.value.filter(d => d.type === 'line').length + 1
        drawings.value.push({
          type: 'line',
          name: `线段${lineIndex}`,
          data: { points, polyline },
          id: Date.now(),
          timestamp: new Date()
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
    dlog('设置添加面工具')
    let isDrawing = false
    let points = []
    let polygon = null

    const handleClick = (e) => {
      dlog('绘制多边形:', e.latlng)

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
        dlog('多边形绘制完成')
        isDrawing = false
        
        // 保存多边形数据
        const polygonIndex = drawings.value.filter(d => d.type === 'polygon').length + 1
        drawings.value.push({
          type: 'polygon',
          name: `区域${polygonIndex}`,
          data: { points, polygon },
          id: Date.now(),
          timestamp: new Date()
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
    dlog('设置画笔工具')

    // 禁用地图拖拽
    dlog('禁用地图拖拽')
    mapInstance.dragging.disable()

    let isDrawing = false
    let points = []
    let polyline = null

    const handleMouseDown = (e) => {
      dlog('开始自由绘制')
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
        dlog('自由绘制完成')
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
      dlog('清除所有绘图')
      
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
      dlog('导出数据:', format)
      if (drawings.value.length === 0) {
        reject(new Error('没有可导出的数据'))
        return
      }
      
      let data = ''
      let mimeType = 'text/plain'
      let fileExtension = format
      
      try {
        switch (format.toLowerCase()) {
          case 'kml':
            data = generateKML()
            mimeType = 'application/vnd.google-earth.kml+xml'
            break
          case 'geojson':
            data = generateGeoJSON()
            mimeType = 'application/json'
            break
          case 'csv':
            data = generateCSV()
            mimeType = 'text/csv'
            break
          default:
            reject(new Error(`不支持的导出格式: ${format}`))
            return
        }
        
        const blob = new Blob([data], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `绘图数据_${new Date().toISOString().split('T')[0]}.${fileExtension}`
        link.click()
        URL.revokeObjectURL(url)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  // 生成KML格式
  const generateKML = () => {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>绘图数据导出</name>
    <description>导出时间: ${new Date().toLocaleString()}，坐标系: WGS84</description>
`
    
    const footer = `  </Document>
</kml>`
    
    let content = ''
    
    drawings.value.forEach(drawing => {
      content += `    <Placemark>
      <name>${drawing.name || '未命名'}</name>
      <description>类型: ${getTypeLabel(drawing.type)}${drawing.data.distance ? `，距离: ${drawing.data.distance.toFixed(2)}米` : ''}</description>
`
      
      switch (drawing.type) {
        case 'point':
          const pointCoords = drawing.data.latlng
          // 假设 pointCoords 当前为 GCJ-02，导出前转换为 WGS84
          const [ptLngW, ptLatW] = gcj02ToWgs84(pointCoords.lng, pointCoords.lat)
          content += `      <Point>
        <coordinates>${ptLngW},${ptLatW},0</coordinates>
      </Point>
`
          break
          
        case 'line':
        case 'measure':
          content += `      <LineString>
        <coordinates>
`
          drawing.data.points.forEach(point => {
            const [lngW, latW] = gcj02ToWgs84(point.lng, point.lat)
            content += `          ${lngW},${latW},0\n`
          })
          content += `        </coordinates>
      </LineString>
`
          break
          
        case 'polygon':
          content += `      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
`
          drawing.data.points.forEach(point => {
            const [lngW, latW] = gcj02ToWgs84(point.lng, point.lat)
            content += `              ${lngW},${latW},0\n`
          })
          // 闭合多边形
          if (drawing.data.points.length > 0) {
            const firstPoint = drawing.data.points[0]
            const [firstLngW, firstLatW] = gcj02ToWgs84(firstPoint.lng, firstPoint.lat)
            content += `              ${firstLngW},${firstLatW},0\n`
          }
          content += `            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
`
          break
      }
      
      content += `    </Placemark>
`
    })
    
    return header + content + footer
  }

  // 生成GeoJSON格式
  const generateGeoJSON = () => {
    const features = drawings.value.map(drawing => {
      let geometry = {}
      
      switch (drawing.type) {
        case 'point':
          {
            const [lngW, latW] = gcj02ToWgs84(drawing.data.latlng.lng, drawing.data.latlng.lat)
            geometry = { 
              type: 'Point', 
              coordinates: [lngW, latW] 
            }
          }
          break
          
        case 'line':
        case 'measure':
          geometry = {
            type: 'LineString',
            coordinates: drawing.data.points.map(p => {
              const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat)
              return [lngW, latW]
            })
          }
          break
          
        case 'polygon':
          const coords = drawing.data.points.map(p => {
            const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat)
            return [lngW, latW]
          })
          // 闭合多边形
          if (coords.length > 0) {
            coords.push(coords[0])
          }
          geometry = {
            type: 'Polygon',
            coordinates: [coords]
          }
          break
      }
      
      const properties = {
        name: drawing.name || '未命名',
        type: drawing.type,
        typeLabel: getTypeLabel(drawing.type),
        id: drawing.id,
        timestamp: drawing.timestamp?.toISOString()
      }
      
      if (drawing.data.distance) {
        properties.distance = drawing.data.distance
        properties.distanceText = `${drawing.data.distance.toFixed(2)}米`
      }
      
      return {
        type: 'Feature',
        geometry,
        properties
      }
    })
    
    const geoJSON = {
      type: 'FeatureCollection',
      features,
      crs: {
        type: 'name',
        properties: {
          name: 'WGS84'
        }
      },
      metadata: {
        generated: new Date().toISOString(),
        count: drawings.value.length,
        generator: '地图绘图工具',
        coordinateSystem: 'WGS84'
      }
    }
    
    return JSON.stringify(geoJSON, null, 2)
  }

  // 生成CSV格式
  const generateCSV = () => {
    const headers = ['名称', '类型', '经度', '纬度', '距离(米)', '创建时间', '描述']
    let csv = headers.join(',') + '\n'
    
    drawings.value.forEach(drawing => {
      const baseInfo = [
        `"${drawing.name || '未命名'}"`,
        `"${getTypeLabel(drawing.type)}"`,
        '', // 经度 - 稍后填充
        '', // 纬度 - 稍后填充
        drawing.data.distance ? drawing.data.distance.toFixed(2) : '',
        drawing.timestamp ? `"${drawing.timestamp.toLocaleString()}"` : '',
        `"${drawing.type === 'measure' ? '测距线段' : '绘图元素'}"`
      ]
      
      switch (drawing.type) {
        case 'point':
          {
            const [lngW, latW] = gcj02ToWgs84(drawing.data.latlng.lng, drawing.data.latlng.lat)
            baseInfo[2] = lngW.toFixed(6)
            baseInfo[3] = latW.toFixed(6)
            csv += baseInfo.join(',') + '\n'
          }
          break
          
        case 'line':
        case 'measure':
        case 'polygon':
          drawing.data.points.forEach((point, index) => {
            const [lngW, latW] = gcj02ToWgs84(point.lng, point.lat)
            const row = [...baseInfo]
            row[0] = `"${drawing.name || '未命名'} - 点${index + 1}"`
            row[2] = lngW.toFixed(6)
            row[3] = latW.toFixed(6)
            csv += row.join(',') + '\n'
          })
          break
      }
    })
    
    return csv
  }

  // 获取类型标签
  const getTypeLabel = (type) => {
    const typeMap = {
      'point': '点位',
      'line': '线段',
      'polygon': '区域',
      'measure': '测距'
    }
    return typeMap[type] || type
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