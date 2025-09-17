import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';

// 启动测距工具
export function startMeasure(deactivateTool) {
  if (!state.mapInstance) return;

  let measureLine = null;
  let totalDistance = 0;
  let points = [];
  let segmentTooltips = []; // 每段距离提示
  let pointMarkers = []; // 点击位置小点

  const onClick = (e) => {
    points.push(e.latlng);
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
    } else {
      measureLine.setLatLngs(points);
      const seg = points[points.length - 2].distanceTo(points[points.length - 1]);
      const segOutput = seg > 1000 ? `${Math.round((seg / 1000) * 100) / 100} km` : `${Math.round(seg * 100) / 100} m`;
      const midPoint = L.latLng(
        (points[points.length - 2].lat + points[points.length - 1].lat) / 2,
        (points[points.length - 2].lng + points[points.length - 1].lng) / 2,
      );
      const segmentTooltip = L.tooltip({ permanent: true, direction: 'center', className: 'segment-distance-tooltip' })
        .setLatLng(midPoint)
        .setContent(segOutput)
        .addTo(state.mapInstance);
      segmentTooltips.push(segmentTooltip);

      totalDistance = 0;
      for (let i = 0; i < points.length - 1; i++) totalDistance += points[i].distanceTo(points[i + 1]);

      const totalOutput = `总距离: ${totalDistance > 1000 ? `${Math.round((totalDistance / 1000) * 100) / 100} km` : `${Math.round(totalDistance * 100) / 100} m`}`;
      if (state.measureTooltip) {
        state.measureTooltip.setLatLng(e.latlng).setContent(totalOutput);
      } else {
        state.measureTooltip = L.tooltip({ permanent: true, direction: 'top', className: 'total-distance-tooltip' })
          .setLatLng(e.latlng)
          .setContent(totalOutput)
          .addTo(state.mapInstance);
      }
    }
  };

  const onDblClick = () => {
    if (measureLine) {
      drawings.value.push({
        type: 'Measure',
        coordinates: points.map((p) => [p.lng, p.lat]),
        layer: measureLine,
        distance: totalDistance,
        tooltips: [...segmentTooltips, state.measureTooltip],
        pointMarkers,
      });
    }
    segmentTooltips = [];
    pointMarkers = [];
    state.measureTooltip = null;
    cleanup();
    ElMessage.success('测距完成');
    deactivateTool?.();
  };

  const cleanup = () => {
    state.mapInstance.off('click', onClick);
    state.mapInstance.off('dblclick', onDblClick);
  };

  state.mapInstance.on('click', onClick);
  state.mapInstance.on('dblclick', onDblClick);
}
