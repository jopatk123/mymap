import { ref, computed } from 'vue'
import L from 'leaflet'

// 工具状态管理
const activeTool = ref(null)
const mapInstance = ref(null)
const drawings = ref([])

// 各种绘图工具的临时状态
const measurePath = ref(null)
const measureTooltip = ref(null)
const currentDrawing = ref(null)
const drawingPath = ref([])

export function useDrawingTools() {
  // 计算属性
  const hasDrawings = computed(() => drawings.value.length > 0)

  // 初始化工具
  const initializeTools = (map) => {
    if (!map) return
    mapInstance.value = map
    
    // 确保地图容器存在绘图图层组
    if (!map.drawingLayerGroup) {
      map.drawingLayerGroup = L.layerGroup().addTo(map)
    }
  }

  // 激活工具
  const activateTool = (toolType, map) => {
    if (!map) return
    
    // 先停用当前工具
    deactivateTool()
    
    activeTool.value = toolType
    mapInstance.value = map
    
    switch (toolType) {
      case 'measure':
        activateMeasureTool()
        break
      case 'point':
        activatePointTool()
        break
      case 'line':
        activateLineTool()
        break
      case 'polygon':
        activatePolygonTool()
        break
      case 'draw':
        activateDrawTool()
        break
    }
  }

  // 停用工具
  const deactivateTool = () => {
    if (!activeTool.value || !mapInstance.value) return
    
    const map = mapInstance.value
    
    // 移除所有事件监听器
    map.off('click', handleMapClick)
    map.off('mousemove', handleMouseMove)
    map.off('dblclick', handleDoubleClick)
    
    // 清理临时元素
    cleanupTempElements()
    
    // 重置鼠标样式
    map.getContainer().style.cursor = ''
    
    activeTool.value = null
  }

  // 测距工具
  const activateMeasureTool = () => {
    const map = mapInstance.value
    map.getContainer().style.cursor = 'crosshair'
    
    let isDrawing = false
    let points = []
    let polyline = null
    let totalDistance = 0
    
    const handleMeasureClick = (e) => {
      if (!isDrawing) {
        // 开始测距
        isDrawing = true
        points = [e.latlng]
        
        // 创建折线
        polyline = L.polyline([e.latlng], {
          color: '#ff0000',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        }).addTo(map.drawingLayerGroup)
        
        // 添加起点标记
        const startMarker = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'measure-marker start',
            html: '<div class="measure-point">起点</div>',
            iconSize: [40, 20],
            iconAnchor: [20, 10]
          })
        }).addTo(map.drawingLayerGroup)
        
        measurePath.value = { polyline, markers: [startMarker], points: [...points] }
      } else {
        // 添加测距点
        points.push(e.latlng)
        polyline.addLatLng(e.latlng)
        
        // 计算距离
        const segmentDistance = points[points.length - 2].distanceTo(e.latlng)
        totalDistance += segmentDistance
        
        // 添加距离标记
        const distanceMarker = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'measure-marker',
            html: `<div class="measure-point">${formatDistance(totalDistance)}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          })
        }).addTo(map.drawingLayerGroup)
        
        measurePath.value.markers.push(distanceMarker)
        measurePath.value.points = [...points]
      }
    }
    
    const handleMeasureDoubleClick = () => {
      if (isDrawing) {
        // 完成测距
        isDrawing = false
        
        // 保存到绘图数组
        drawings.value.push({
          type: 'measure',
          data: measurePath.value,
          id: Date.now()
        })
        
        measurePath.value = null
        deactivateTool()
      }
    }
    
    map.on('click', handleMeasureClick)
    map.on('dblclick', handleMeasureDoubleClick)
  }

  // 添加点工具
  const activatePointTool = () => {
    const map = mapInstance.value
    map.getContainer().style.cursor = 'crosshair'
    
    const handlePointClick = (e) => {
      const marker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'drawing-point-marker',
          html: '<div class="point-icon">📍</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map.drawingLayerGroup)
      
      // 保存到绘图数组
      drawings.value.push({
        type: 'point',
        data: { marker, latlng: e.latlng },
        id: Date.now()
      })
    }
    
    map.on('click', handlePointClick)
  }

  // 添加线工具
  const activateLineTool = () => {
    const map = mapInstance.value
    map.getContainer().style.cursor = 'crosshair'
    
    let isDrawing = false
    let points = []
    let polyline = null
    
    const handleLineClick = (e) => {
      if (!isDrawing) {
        // 开始画线
        isDrawing = true
        points = [e.latlng]
        
        polyline = L.polyline([e.latlng], {
          color: '#0066ff',
          weight: 3,
          opacity: 0.8
        }).addTo(map.drawingLayerGroup)
        
        currentDrawing.value = { polyline, points: [...points] }
      } else {
        // 添加线段点
        points.push(e.latlng)
        polyline.addLatLng(e.latlng)
        currentDrawing.value.points = [...points]
      }
    }
    
    const handleLineDoubleClick = () => {
      if (isDrawing) {
        // 完成画线
        isDrawing = false
        
        drawings.value.push({
          type: 'line',
          data: currentDrawing.value,
          id: Date.now()
        })
        
        currentDrawing.value = null
        deactivateTool()
      }
    }
    
    map.on('click', handleLineClick)
    map.on('dblclick', handleLineDoubleClick)
  }

  // 添加面工具
  const activatePolygonTool = () => {
    const map = mapInstance.value
    map.getContainer().style.cursor = 'crosshair'
    
    let isDrawing = false
    let points = []
    let polygon = null
    
    const handlePolygonClick = (e) => {
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
        }).addTo(map.drawingLayerGroup)
        
        currentDrawing.value = { polygon, points: [...points] }
      } else {
        // 添加多边形点
        points.push(e.latlng)
        polygon.setLatLngs([...points])
        currentDrawing.value.points = [...points]
      }
    }
    
    const handlePolygonDoubleClick = () => {
      if (isDrawing && points.length >= 3) {
        // 完成画面
        isDrawing = false
        
        drawings.value.push({
          type: 'polygon',
          data: currentDrawing.value,
          id: Date.now()
        })
        
        currentDrawing.value = null
        deactivateTool()
      }
    }
    
    map.on('click', handlePolygonClick)
    map.on('dblclick', handlePolygonDoubleClick)
  }

  // 画笔工具
  const activateDrawTool = () => {
    const map = mapInstance.value
    map.getContainer().style.cursor = 'crosshair'
    
    let isDrawing = false
    let points = []
    let polyline = null
    
    const handleDrawMouseDown = (e) => {
      isDrawing = true
      points = [e.latlng]
      
      polyline = L.polyline([e.latlng], {
        color: '#ff6600',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(map.drawingLayerGroup)
      
      currentDrawing.value = { polyline, points: [...points] }
    }
    
    const handleDrawMouseMove = (e) => {
      if (isDrawing) {
        points.push(e.latlng)
        polyline.addLatLng(e.latlng)
        currentDrawing.value.points = [...points]
      }
    }
    
    const handleDrawMouseUp = () => {
      if (isDrawing) {
        isDrawing = false
        
        drawings.value.push({
          type: 'draw',
          data: currentDrawing.value,
          id: Date.now()
        })
        
        currentDrawing.value = null
      }
    }
    
    map.on('mousedown', handleDrawMouseDown)
    map.on('mousemove', handleDrawMouseMove)
    map.on('mouseup', handleDrawMouseUp)
  }

  // 清理临时元素
  const cleanupTempElements = () => {
    if (measurePath.value) {
      measurePath.value = null
    }
    if (currentDrawing.value) {
      currentDrawing.value = null
    }
    drawingPath.value = []
  }

  // 清除所有绘图
  const clearAllDrawings = () => {
    return new Promise((resolve) => {
      if (mapInstance.value && mapInstance.value.drawingLayerGroup) {
        mapInstance.value.drawingLayerGroup.clearLayers()
      }
      drawings.value = []
      cleanupTempElements()
      deactivateTool()
      resolve()
    })
  }

  // 导出绘图数据
  const exportDrawings = (format) => {
    return new Promise((resolve, reject) => {
      if (drawings.value.length === 0) {
        reject(new Error('没有可导出的数据'))
        return
      }
      
      try {
        let exportData
        let filename
        let mimeType
        
        if (format === 'kml') {
          exportData = generateKML()
          filename = `drawings_${Date.now()}.kml`
          mimeType = 'application/vnd.google-earth.kml+xml'
        } else if (format === 'csv') {
          exportData = generateCSV()
          filename = `drawings_${Date.now()}.csv`
          mimeType = 'text/csv'
        }
        
        // 创建下载链接
        const blob = new Blob([exportData], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        
        // 清理
        URL.revokeObjectURL(url)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  // 生成 KML 格式数据
  const generateKML = () => {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Drawing Data</name>
    <description>Exported from Map Drawing Tools</description>
`
    
    drawings.value.forEach((drawing, index) => {
      switch (drawing.type) {
        case 'point':
          kml += `    <Placemark>
      <name>Point ${index + 1}</name>
      <Point>
        <coordinates>${drawing.data.latlng.lng},${drawing.data.latlng.lat}</coordinates>
      </Point>
    </Placemark>
`
          break
        case 'line':
        case 'draw':
          const lineCoords = drawing.data.points.map(p => `${p.lng},${p.lat}`).join(' ')
          kml += `    <Placemark>
      <name>Line ${index + 1}</name>
      <LineString>
        <coordinates>${lineCoords}</coordinates>
      </LineString>
    </Placemark>
`
          break
        case 'polygon':
          const polyCoords = drawing.data.points.map(p => `${p.lng},${p.lat}`).join(' ')
          kml += `    <Placemark>
      <name>Polygon ${index + 1}</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${polyCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
`
          break
      }
    })
    
    kml += `  </Document>
</kml>`
    
    return kml
  }

  // 生成 CSV 格式数据
  const generateCSV = () => {
    let csv = 'Type,Name,Latitude,Longitude,Additional_Info\n'
    
    drawings.value.forEach((drawing, index) => {
      switch (drawing.type) {
        case 'point':
          csv += `Point,Point ${index + 1},${drawing.data.latlng.lat},${drawing.data.latlng.lng},\n`
          break
        case 'line':
        case 'draw':
          drawing.data.points.forEach((point, pIndex) => {
            csv += `${drawing.type},${drawing.type} ${index + 1} Point ${pIndex + 1},${point.lat},${point.lng},\n`
          })
          break
        case 'polygon':
          drawing.data.points.forEach((point, pIndex) => {
            csv += `Polygon,Polygon ${index + 1} Point ${pIndex + 1},${point.lat},${point.lng},\n`
          })
          break
      }
    })
    
    return csv
  }

  // 辅助函数：格式化距离显示
  const formatDistance = (distance) => {
    if (distance < 1000) {
      return Math.round(distance) + 'm'
    } else {
      return (distance / 1000).toFixed(2) + 'km'
    }
  }

  // 通用事件处理器
  const handleMapClick = (e) => {
    // 具体实现根据当前激活的工具决定
  }
  
  const handleMouseMove = (e) => {
    // 具体实现根据当前激活的工具决定
  }
  
  const handleDoubleClick = (e) => {
    // 具体实现根据当前激活的工具决定
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