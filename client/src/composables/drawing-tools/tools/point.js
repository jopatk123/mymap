import L from 'leaflet'
import { dlog } from '../utils/debug.js'

export function createPointTool(mapInstance, drawings, register) {
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

    const pointIndex = drawings.value.filter((d) => d.type === 'point').length + 1
    drawings.value.push({
      type: 'point',
      name: `点位${pointIndex}`,
      data: { latlng: e.latlng, marker },
      id: Date.now(),
      timestamp: new Date()
    })
  }

  register({ click: handleClick })
}
