import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js'
import { getTypeLabel } from '../utils/shared.js'

export function generateKML(drawings) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>绘图数据导出</name>\n    <description>导出时间: ${new Date().toLocaleString()}，坐标系: WGS84</description>\n`
  const footer = `  </Document>\n</kml>`

  let content = ''
  drawings.forEach((drawing) => {
    content += `    <Placemark>\n      <name>${drawing.name || '未命名'}</name>\n      <description>类型: ${getTypeLabel(drawing.type)}${drawing.data?.distance ? `，距离: ${drawing.data.distance.toFixed(2)}米` : ''}</description>\n`

    switch (drawing.type) {
      case 'point': {
        const pointCoords = drawing.data.latlng
        const [lngW, latW] = gcj02ToWgs84(pointCoords.lng, pointCoords.lat)
        content += `      <Point>\n        <coordinates>${lngW},${latW},0</coordinates>\n      </Point>\n`
        break
      }
      case 'line':
      case 'measure': {
        content += `      <LineString>\n        <coordinates>\n`
        drawing.data.points.forEach((p) => {
          const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat)
          content += `          ${lngW},${latW},0\n`
        })
        content += `        </coordinates>\n      </LineString>\n`
        break
      }
      case 'polygon': {
        content += `      <Polygon>\n        <outerBoundaryIs>\n          <LinearRing>\n            <coordinates>\n`
        drawing.data.points.forEach((p) => {
          const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat)
          content += `              ${lngW},${latW},0\n`
        })
        if (drawing.data.points.length > 0) {
          const first = drawing.data.points[0]
          const [lngW, latW] = gcj02ToWgs84(first.lng, first.lat)
          content += `              ${lngW},${latW},0\n`
        }
        content += `            </coordinates>\n          </LinearRing>\n        </outerBoundaryIs>\n      </Polygon>\n`
        break
      }
      default:
        break
    }

    content += `    </Placemark>\n`
  })

  return header + content + footer
}
