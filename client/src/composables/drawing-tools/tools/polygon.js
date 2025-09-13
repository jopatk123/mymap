import L from 'leaflet'
import { dlog } from '../utils/debug.js'

export function createPolygonTool(mapInstance, drawings, register) {
  dlog('设置添加面工具')
  let isDrawing = false
  let points = []
  let polygon = null

  const handleClick = (e) => {
    dlog('绘制多边形:', e.latlng)
    if (!isDrawing) {
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
      points.push(e.latlng)
      polygon.setLatLngs([...points])
    }
  }

  const handleDoubleClick = () => {
    if (isDrawing && points.length >= 3) {
      dlog('多边形绘制完成')
      isDrawing = false
      const polygonIndex = drawings.value.filter((d) => d.type === 'polygon').length + 1
      drawings.value.push({
        type: 'polygon',
        name: `区域${polygonIndex}`,
        data: { points, polygon },
        id: Date.now(),
        timestamp: new Date()
      })
    }
  }

  register({ click: handleClick, dblclick: handleDoubleClick })
}
