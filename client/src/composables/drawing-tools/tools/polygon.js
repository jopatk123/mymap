import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

export function startDrawPolygon(deactivateTool) {
  if (!state.mapInstance) return;

  let points = [];
  let wgsPoints = []; // 存储为 WGS84
  let polygon = null;

  const onClick = (e) => {
    points.push(e.latlng); // 渲染使用 GCJ-02
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
    wgsPoints.push([wgsLng, wgsLat]);
    if (points.length === 1) {
      polygon = L.polygon(points, {
        fillColor: '#00ff00',
        fillOpacity: 0.3,
        color: '#00ff00',
        weight: 2,
      }).addTo(state.drawingLayer);
    } else {
      polygon.setLatLngs(points);
    }
  };

  const onDblClick = () => {
    if (polygon && points.length > 2) {
      drawings.value.push({
        type: 'Polygon',
        coordinates: [wgsPoints], // WGS84
        coordinateSystem: 'wgs84',
        layer: polygon,
      });
      ElMessage.success('添加面成功');
    }
    cleanup();
    deactivateTool?.();
  };

  const cleanup = () => {
    state.mapInstance.off('click', onClick);
    state.mapInstance.off('dblclick', onDblClick);
  };

  // 保存清理函数，以便在切换工具时调用
  state.currentCleanup = cleanup;

  state.mapInstance.on('click', onClick);
  state.mapInstance.on('dblclick', onDblClick);
}
