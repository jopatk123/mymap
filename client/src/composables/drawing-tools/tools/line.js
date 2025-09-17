import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';

export function startDrawLine(deactivateTool) {
  if (!state.mapInstance) return;

  let points = [];
  let polyline = null;

  const onClick = (e) => {
    points.push(e.latlng);
    if (points.length === 1) {
      polyline = L.polyline(points, { color: '#0000ff', weight: 3 }).addTo(state.drawingLayer);
    } else {
      polyline.setLatLngs(points);
    }
  };

  const onDblClick = () => {
    if (polyline && points.length > 1) {
      drawings.value.push({ type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]), layer: polyline });
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
