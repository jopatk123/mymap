import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';
import { getTypeLabel } from '../utils/shared.js';

export function generateCSV(drawings) {
  const headers = ['名称', '类型', '经度', '纬度', '距离(米)', '创建时间', '描述'];
  let csv = headers.join(',') + '\n';

  drawings.forEach((drawing) => {
    const baseInfo = [
      `"${drawing.name || '未命名'}"`,
      `"${getTypeLabel(drawing.type)}"`,
      '',
      '',
      drawing.data.distance ? drawing.data.distance.toFixed(2) : '',
      drawing.timestamp ? `"${drawing.timestamp.toLocaleString()}"` : '',
      `"${drawing.type === 'measure' ? '测距线段' : '绘图元素'}"`,
    ];

    switch (drawing.type) {
      case 'point': {
        const [lngW, latW] = gcj02ToWgs84(drawing.data.latlng.lng, drawing.data.latlng.lat);
        baseInfo[2] = lngW.toFixed(6);
        baseInfo[3] = latW.toFixed(6);
        csv += baseInfo.join(',') + '\n';
        break;
      }
      case 'line':
      case 'measure':
      case 'polygon': {
        drawing.data.points.forEach((p, idx) => {
          const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat);
          const row = [...baseInfo];
          row[0] = `"${drawing.name || '未命名'} - 点${idx + 1}"`;
          row[2] = lngW.toFixed(6);
          row[3] = latW.toFixed(6);
          csv += row.join(',') + '\n';
        });
        break;
      }
      default:
        break;
    }
  });

  return csv;
}
