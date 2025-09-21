import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

export function startDrawLine(deactivateTool) {
  if (!state.mapInstance) return;

  let points = [];
  let wgsPoints = []; // 存储为 WGS84
  let polyline = null;

  const onClick = (e) => {
    points.push(e.latlng); // 渲染使用 GCJ-02
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
    wgsPoints.push([wgsLng, wgsLat]); // 存为 WGS84
    if (points.length === 1) {
      polyline = L.polyline(points, { color: '#0000ff', weight: 3 }).addTo(state.drawingLayer);
    } else {
      polyline.setLatLngs(points);
    }
  };

  const onDblClick = () => {
    if (polyline && points.length > 1) {
      drawings.value.push({
        type: 'LineString',
        coordinates: wgsPoints, // 持久化为 WGS84
        coordinateSystem: 'wgs84',
        layer: polyline,
      });
      ElMessage.success('添加线成功');
    }
    cleanup();
    deactivateTool?.();
  };

  const cleanup = () => {
    state.mapInstance.off('click', onClick);
    state.mapInstance.off('dblclick', onDblClick);
  };

  state.mapInstance.on('click', onClick);
  state.mapInstance.on('dblclick', onDblClick);
}
