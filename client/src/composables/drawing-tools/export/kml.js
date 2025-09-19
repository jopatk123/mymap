import { ElMessage } from 'element-plus';
import { drawings } from '../state.js';
import { getDrawingTypeName } from '../utils/type-names.js';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convertCoord(lng, lat) {
  try {
    // 尝试把坐标从 GCJ-02 转为 WGS84（如果原本就是 WGS84，误差通常较小）
    const [wgsLng, wgsLat] = gcj02ToWgs84(lng, lat);
    return [wgsLng, wgsLat];
  } catch (e) {
    return [lng, lat];
  }
}

function coordsToKmlString(coordsArray) {
  // coordsArray: [[lng,lat], ...]
  return coordsArray.map(c => `${c[0]},${c[1]},0`).join('\n');
}

function generateKMLForDrawings(wgsDrawings, title = '地图绘制导出') {
  let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>${title}</name>\n    <description>从地图绘制导出的内容</description>\n`;

  wgsDrawings.forEach((drawing, index) => {
    const name = drawing.name || `${getDrawingTypeName(drawing.type)}_${index + 1}`;
    const description = drawing.description || `用户绘制的${getDrawingTypeName(drawing.type)}`;

    kmlContent += `    <Placemark>\n      <name>${name}</name>\n      <description>${description}</description>\n`;

    if (drawing.type === 'Point') {
      const c = drawing.coordinates;
      kmlContent += `      <Point>\n        <coordinates>${c[0]},${c[1]},0</coordinates>\n      </Point>\n`;
    } else if (drawing.type === 'LineString' || drawing.type === 'Freehand' || drawing.type === 'Measure') {
      kmlContent += `      <LineString>\n        <coordinates>\n`;
      kmlContent += coordsToKmlString(drawing.coordinates.map(c => [c[0], c[1]])) + '\n';
      kmlContent += `        </coordinates>\n      </LineString>\n`;
    } else if (drawing.type === 'Polygon') {
      kmlContent += `      <Polygon>\n        <outerBoundaryIs>\n          <LinearRing>\n            <coordinates>\n`;
      // outer ring
      kmlContent += coordsToKmlString(drawing.coordinates[0].map(c => [c[0], c[1]])) + '\n';
      // ensure closed
      if (drawing.coordinates[0].length > 0) {
        const firstCoord = drawing.coordinates[0][0];
        kmlContent += `${firstCoord[0]},${firstCoord[1]},0\n`;
      }
      kmlContent += `            </coordinates>\n          </LinearRing>\n        </outerBoundaryIs>\n      </Polygon>\n`;
    }

    kmlContent += `    </Placemark>\n`;
  });

  kmlContent += `  </Document>\n</kml>`;
  return kmlContent;
}

function generateCSVForDrawings(wgsDrawings) {
  // 新增 Longitude 和 Latitude 列（WGS84），并保留 Coordinates 列用于线/面
  const headers = ['Index', 'Name', 'Type', 'Description', 'Longitude(WGS84)', 'Latitude(WGS84)', 'Coordinates(WGS84)'];
  const rows = [headers.join(',')];

  function escapeCSVField(text) {
    if (text === null || text === undefined) return '';
    const s = String(text);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  wgsDrawings.forEach((drawing, idx) => {
    let lon = '';
    let lat = '';
    let coordsStr = '';

    if (drawing && drawing.coordinates) {
      if (drawing.type === 'Point' && Array.isArray(drawing.coordinates)) {
        lon = drawing.coordinates[0];
        lat = drawing.coordinates[1];
        coordsStr = `${lat} ${lon}`; // lat lon for consistency
      } else if (drawing.type === 'Polygon' && Array.isArray(drawing.coordinates) && Array.isArray(drawing.coordinates[0])) {
        coordsStr = drawing.coordinates[0].map(c => `${c[1]} ${c[0]}`).join('|');
        // 可选：把第一个点作为代表经纬
        if (drawing.coordinates[0].length > 0) {
          lon = drawing.coordinates[0][0][0];
          lat = drawing.coordinates[0][0][1];
        }
      } else if (Array.isArray(drawing.coordinates)) {
        // LineString / Freehand / Measure - take first coordinate as representative
        if (drawing.coordinates.length > 0) {
          const first = drawing.coordinates[0];
          if (Array.isArray(first)) {
            lon = first[0];
            lat = first[1];
          }
        }
        coordsStr = drawing.coordinates.map(c => (Array.isArray(c) ? `${c[1]} ${c[0]}` : '')).join('|');
      }
    }

    const rowFields = [
      idx + 1,
      escapeCSVField(drawing.name || ''),
      drawing.type || '',
      escapeCSVField(drawing.description || ''),
      lon || '',
      lat || '',
      escapeCSVField(coordsStr)
    ];

    const row = rowFields.join(',');

    rows.push(row);
  });

  // 使用 CRLF 兼容 Excel
  return rows.join('\r\n');
}

/**
 * 导出绘图（支持 kml 或 csv），并尽量把坐标转换为 WGS84
 * @param {string} format 'kml' | 'csv'
 */
export function exportToKml(format = 'kml') {
  if (drawings.value.length === 0) {
    ElMessage.warning('\u6ca1\u6709\u53ef\u5bfc\u51fa\u7684\u5185\u5bb9');
    return;
  }

  // 复制并转换坐标为 WGS84
  // 从 drawing 对象中安全地提取可序列化的字段，避免循环引用
  function normalizeLatLngs(obj) {
    // Leaflet layer helpers
    try {
      if (!obj) return null;
      if (Array.isArray(obj)) return obj; // assume already [lng,lat] or nested arrays

      if (obj.geometry && Array.isArray(obj.geometry.coordinates)) return obj.geometry.coordinates;

      if (typeof obj.getLatLng === 'function') {
        const p = obj.getLatLng();
        return [p.lng, p.lat];
      }

      if (typeof obj.getLatLngs === 'function') {
        const latlngs = obj.getLatLngs();
        // convert Leaflet latlngs recursively
        const mapLatLngs = (arr) => {
          if (!Array.isArray(arr)) return arr;
          if (arr.length === 0) return [];
          if (arr[0] && typeof arr[0].lat === 'number') {
            return arr.map(ll => [ll.lng, ll.lat]);
          }
          return arr.map(mapLatLngs);
        };
        return mapLatLngs(latlngs);
      }

      if (obj.coordinates && Array.isArray(obj.coordinates)) return obj.coordinates;
      if (obj.latlng && typeof obj.latlng.lng === 'number') return [obj.latlng.lng, obj.latlng.lat];
      if (typeof obj.lng === 'number' && typeof obj.lat === 'number') return [obj.lng, obj.lat];
    } catch (e) {
      // ignore and return null
    }
    return null;
  }

  const wgsDrawings = drawings.value.map(d => {
    const type = d.type || (d.geometry && d.geometry.type) || 'Point';
    const name = d.name || (d.options && d.options.name) || '';
    const description = d.description || (d.options && d.options.description) || '';
    const rawCoords = normalizeLatLngs(d);

    const copy = {
      type,
      name,
      description,
      coordinates: rawCoords,
    };

    // 如果没有可用坐标则跳过转换（后续生成时会忽略）
    if (!copy.coordinates) return copy;

    // 执行坐标转换（支持点、线、面）
    if (copy.type === 'Point' && Array.isArray(copy.coordinates)) {
      const [lng, lat] = copy.coordinates;
      const [wgsLng, wgsLat] = convertCoord(lng, lat);
      copy.coordinates = [wgsLng, wgsLat];
    } else if (copy.type === 'Polygon' && Array.isArray(copy.coordinates) && Array.isArray(copy.coordinates[0])) {
      copy.coordinates[0] = copy.coordinates[0].map(c => {
        const [lng, lat] = c;
        const [wgsLng, wgsLat] = convertCoord(lng, lat);
        return [wgsLng, wgsLat];
      });
    } else if (Array.isArray(copy.coordinates)) {
      // LineString / Freehand / Measure or nested arrays
      const mapCoords = (arr) => {
        if (!Array.isArray(arr)) return arr;
        if (arr.length === 0) return [];
        if (typeof arr[0] === 'number') {
          const [lng, lat] = arr;
          const [wgsLng, wgsLat] = convertCoord(lng, lat);
          return [wgsLng, wgsLat];
        }
        return arr.map(mapCoords);
      };
      copy.coordinates = mapCoords(copy.coordinates);
    }

    return copy;
  });

  if (format === 'csv') {
    try {
      const csvContent = generateCSVForDrawings(wgsDrawings);
      const filename = `地图绘制导出_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
      downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
      ElMessage.success('CSV 文件导出成功');
    } catch (err) {
      ElMessage.error('CSV 导出失败: ' + err.message);
      console.error(err);
    }
    return;
  }

  // 默认 KML
  try {
    const kml = generateKMLForDrawings(wgsDrawings);
    const filename = `地图绘制_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.kml`;
    downloadFile(kml, filename, 'application/vnd.google-earth.kml+xml');
    ElMessage.success('KML 文件导出成功');
  } catch (err) {
    ElMessage.error('KML 导出失败: ' + err.message);
    console.error(err);
  }
}
