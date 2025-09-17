import { ElMessage } from 'element-plus';
import { drawings } from '../state.js';
import { getDrawingTypeName } from '../utils/type-names.js';

export function exportToKml() {
  if (drawings.value.length === 0) {
    ElMessage.warning('没有可导出的内容');
    return;
  }

  let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>地图绘制内容</name>\n    <description>从地图工具导出的绘制内容</description>\n`;

  drawings.value.forEach((drawing, index) => {
    const name = drawing.name || `${getDrawingTypeName(drawing.type)}_${index + 1}`;
    const description = drawing.description || `用户绘制的${getDrawingTypeName(drawing.type)}`;

    kmlContent += `    <Placemark>\n      <name>${name}</name>\n      <description>${description}</description>\n`;

    if (drawing.type === 'Point') {
      kmlContent += `      <Point>\n        <coordinates>${drawing.coordinates[0]},${drawing.coordinates[1]},0</coordinates>\n      </Point>\n`;
    } else if (drawing.type === 'LineString' || drawing.type === 'Freehand' || drawing.type === 'Measure') {
      kmlContent += `      <LineString>\n        <coordinates>\n`;
      drawing.coordinates.forEach((coord) => {
        kmlContent += `          ${coord[0]},${coord[1]},0\n`;
      });
      kmlContent += `        </coordinates>\n      </LineString>\n`;
    } else if (drawing.type === 'Polygon') {
      kmlContent += `      <Polygon>\n        <outerBoundaryIs>\n          <LinearRing>\n            <coordinates>\n`;
      drawing.coordinates[0].forEach((coord) => {
        kmlContent += `              ${coord[0]},${coord[1]},0\n`;
      });
      if (drawing.coordinates[0].length > 0) {
        const firstCoord = drawing.coordinates[0][0];
        kmlContent += `              ${firstCoord[0]},${firstCoord[1]},0\n`;
      }
      kmlContent += `            </coordinates>\n          </LinearRing>\n        </outerBoundaryIs>\n      </Polygon>\n`;
    }

    kmlContent += `    </Placemark>\n`;
  });

  kmlContent += `  </Document>\n</kml>`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `地图绘制_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  ElMessage.success('KML文件导出成功');
}
