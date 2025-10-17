import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

export function startFreehand(deactivateTool) {
  if (!state.mapInstance) return;

  let points = [];
  let wgsPoints = [];
  let polyline = null;

  // 禁用地图拖拽
  state.mapInstance.dragging?.disable();

  const onMouseDown = (e) => {
    state.isDrawing = true;
    points = [e.latlng];
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
    wgsPoints = [[wgsLng, wgsLat]];
    polyline = L.polyline(points, { color: '#ff6600', weight: 4, smoothFactor: 1 }).addTo(
      state.drawingLayer
    );
    L.DomEvent.stopPropagation(e.originalEvent);
  };

  const onMouseMove = (e) => {
    if (state.isDrawing && polyline) {
      points.push(e.latlng);
      const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
      wgsPoints.push([wgsLng, wgsLat]);
      polyline.setLatLngs(points);
    }
  };

  const onMouseUp = () => {
    state.isDrawing = false;

    // 在鼠标松开时自动完成绘制
    if (polyline && points.length > 1) {
      // 检查是否已经添加过（避免重复添加）
      const alreadyAdded = drawings.value.some((d) => d.layer === polyline);
      if (!alreadyAdded) {
        drawings.value.push({
          type: 'Freehand',
          coordinates: wgsPoints,
          coordinateSystem: 'wgs84',
          layer: polyline,
        });
        ElMessage.success('画笔绘制完成');
      }
    }

    // 清理事件并结束工具
    cleanup();
    deactivateTool?.();
  };

  const cleanup = () => {
    state.mapInstance.off('mousedown', onMouseDown);
    state.mapInstance.off('mousemove', onMouseMove);
    state.mapInstance.off('mouseup', onMouseUp);
    if (state.mapInstance.dragging && !state.mapInstance.dragging.enabled()) {
      state.mapInstance.dragging.enable();
    }
  };

  // 保存清理函数，以便在切换工具时调用
  state.currentCleanup = cleanup;

  state.mapInstance.on('mousedown', onMouseDown);
  state.mapInstance.on('mousemove', onMouseMove);
  state.mapInstance.on('mouseup', onMouseUp);
}
