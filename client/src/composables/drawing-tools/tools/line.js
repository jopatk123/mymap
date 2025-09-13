import L from 'leaflet'
import { dlog } from '../utils/debug.js'

export function createLineTool(mapInstance, drawings, register) {
  dlog('设置添加线工具')
  let isDrawing = false
  let points = []
  let polyline = null

  const handleClick = (e) => {
    dlog('绘制线:', e.latlng)
    if (!isDrawing) {
      isDrawing = true
      points = [e.latlng]
      polyline = L.polyline([e.latlng], { color: '#0066ff', weight: 3, opacity: 0.8 }).addTo(
        mapInstance.drawingLayerGroup
      )
    } else {
      points.push(e.latlng)
      polyline.addLatLng(e.latlng)
    }
  }

  const handleDoubleClick = () => {
    if (isDrawing) {
      dlog('线条绘制完成')
      isDrawing = false
      const lineIndex = drawings.value.filter((d) => d.type === 'line').length + 1
      drawings.value.push({
        type: 'line',
        name: `线段${lineIndex}`,
        data: { points, polyline },
        id: Date.now(),
        timestamp: new Date()
      })
    }
  }

  register({ click: handleClick, dblclick: handleDoubleClick })
}
