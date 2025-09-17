import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';

export function startDrawPolygon(deactivateTool) {
  if (!state.mapInstance) return;

  let points = [];
  let polygon = null;

  const onClick = (e) => {
    points.push(e.latlng);
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
      drawings.value.push({ type: 'Polygon', coordinates: [points.map((p) => [p.lng, p.lat])], layer: polygon });
      ElMessage.success('添加面成功');
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
