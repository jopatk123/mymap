import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

// 启动测距工具
export function startMeasure(deactivateTool) {
  if (!state.mapInstance) return;

  let measureLine = null;
  let totalDistance = 0;
  let points = [];
  let wgsPoints = [];
  let segmentTooltips = []; // 每段距离提示
  let pointMarkers = []; // 点击位置小点

  const onClick = (e) => {
    points.push(e.latlng);
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
    wgsPoints.push([wgsLng, wgsLat]);
    const dot = L.circleMarker(e.latlng, {
      radius: 4,
      fillColor: '#ff0000',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(state.drawingLayer);
    pointMarkers.push(dot);

    if (points.length === 1) {
      measureLine = L.polyline(points, {
        color: '#ff0000',
        weight: 2,
        dashArray: '5, 5',
      }).addTo(state.drawingLayer);
    } else if (points.length === 2) {
      // 当点击第2个点时，完成测距
      measureLine.setLatLngs(points);
      const seg = points[0].distanceTo(points[1]);
      const segOutput =
        seg > 1000
          ? `${Math.round((seg / 1000) * 100) / 100} km`
          : `${Math.round(seg * 100) / 100} m`;
      const midPoint = L.latLng(
        (points[0].lat + points[1].lat) / 2,
        (points[0].lng + points[1].lng) / 2
      );
      const segmentTooltip = L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'segment-distance-tooltip',
      })
        .setLatLng(midPoint)
        .setContent(segOutput)
        .addTo(state.mapInstance);
      segmentTooltips.push(segmentTooltip);

      totalDistance = seg;

      // 保存测距结果（不再创建总距离提示框）
      drawings.value.push({
        type: 'Measure',
        coordinates: wgsPoints, // 存储为 WGS84
        coordinateSystem: 'wgs84',
        layer: measureLine,
        distance: totalDistance,
        tooltips: [...segmentTooltips], // 只保存段距离提示框
        pointMarkers,
      });

      segmentTooltips = [];
      pointMarkers = [];
      cleanup();
      ElMessage.success('测距完成');
      deactivateTool?.();
    }
  };

  const cleanup = () => {
    state.mapInstance.off('click', onClick);
  };

  // 保存清理函数，以便在切换工具时调用
  state.currentCleanup = cleanup;

  state.mapInstance.on('click', onClick);
}
