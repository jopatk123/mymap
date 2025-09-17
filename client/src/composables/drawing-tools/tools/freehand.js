import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';

export function startFreehand(deactivateTool) {
  if (!state.mapInstance) return;

  let points = [];
  let polyline = null;

  // 禁用地图拖拽
  state.mapInstance.dragging?.disable();

  const onMouseDown = (e) => {
    state.isDrawing = true;
    points = [e.latlng];
    polyline = L.polyline(points, { color: '#ff6600', weight: 4, smoothFactor: 1 }).addTo(state.drawingLayer);
    L.DomEvent.stopPropagation(e.originalEvent);
  };

  const onMouseMove = (e) => {
    if (state.isDrawing && polyline) {
      points.push(e.latlng);
      polyline.setLatLngs(points);
    }
  };

  const onMouseUp = () => {
    state.isDrawing = false;
  };

  const onDblClick = () => {
    if (polyline && points.length > 1) {
      drawings.value.push({ type: 'Freehand', coordinates: points.map((p) => [p.lng, p.lat]), layer: polyline });
      ElMessage.success('画笔绘制完成');
    }
    cleanup();
    deactivateTool?.();
  };

  const cleanup = () => {
    state.mapInstance.off('mousedown', onMouseDown);
    state.mapInstance.off('mousemove', onMouseMove);
    state.mapInstance.off('mouseup', onMouseUp);
    state.mapInstance.off('dblclick', onDblClick);
    if (state.mapInstance.dragging && !state.mapInstance.dragging.enabled()) {
      state.mapInstance.dragging.enable();
    }
  };

  state.mapInstance.on('mousedown', onMouseDown);
  state.mapInstance.on('mousemove', onMouseMove);
  state.mapInstance.on('mouseup', onMouseUp);
  state.mapInstance.on('dblclick', onDblClick);
}
