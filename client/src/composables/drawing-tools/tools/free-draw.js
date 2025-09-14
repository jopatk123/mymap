import L from 'leaflet';
import { dlog } from '../utils/debug.js';

export function createFreeDrawTool(mapInstance, drawings, register, onCleanup) {
  dlog('设置画笔工具');
  dlog('禁用地图拖拽');
  mapInstance.dragging.disable();

  let isDrawing = false;
  let points = [];
  let polyline = null;

  const handleMouseDown = (e) => {
    dlog('开始自由绘制');
    isDrawing = true;
    points = [e.latlng];
    polyline = L.polyline([e.latlng], {
      color: '#ff6600',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(mapInstance.drawingLayerGroup);
    e.originalEvent?.preventDefault();
    e.originalEvent?.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (isDrawing && polyline) {
      points.push(e.latlng);
      polyline.addLatLng(e.latlng);
      e.originalEvent?.preventDefault();
      e.originalEvent?.stopPropagation();
    }
  };

  const handleMouseUp = (e) => {
    if (isDrawing) {
      dlog('自由绘制完成');
      isDrawing = false;
      drawings.value.push({ type: 'draw', data: { points, polyline }, id: Date.now() });
      e.originalEvent?.preventDefault();
      e.originalEvent?.stopPropagation();
    }
  };

  register({ mousedown: handleMouseDown, mousemove: handleMouseMove, mouseup: handleMouseUp });

  onCleanup?.(() => {
    // 收尾：重新启用拖拽
    mapInstance.dragging.enable();
  });
}
