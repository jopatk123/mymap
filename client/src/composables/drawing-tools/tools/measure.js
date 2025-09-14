import L from 'leaflet';
import { dlog } from '../utils/debug.js';

export function createMeasureTool(mapInstance, drawings, register) {
  dlog('设置测距工具');
  let isDrawing = false;
  let points = [];
  let polyline = null;
  let totalDistance = 0;

  const handleClick = (e) => {
    dlog('测距工具点击:', e.latlng);
    if (!isDrawing) {
      isDrawing = true;
      points = [e.latlng];
      totalDistance = 0;
      polyline = L.polyline([e.latlng], {
        color: '#ff0000',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 5',
      }).addTo(mapInstance.drawingLayerGroup);

      L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'measure-marker',
          html: '<div style="background: rgba(0,128,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">起点</div>',
          iconSize: [40, 20],
          iconAnchor: [20, 10],
        }),
      }).addTo(mapInstance.drawingLayerGroup);
    } else {
      const lastPoint = points[points.length - 1];
      const segmentDistance = lastPoint.distanceTo(e.latlng);
      totalDistance += segmentDistance;
      points.push(e.latlng);
      polyline.addLatLng(e.latlng);

      L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'measure-marker',
          html: `<div style="background: rgba(255,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${
            totalDistance < 1000
              ? Math.round(totalDistance) + 'm'
              : (totalDistance / 1000).toFixed(2) + 'km'
          }</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        }),
      }).addTo(mapInstance.drawingLayerGroup);
    }
  };

  const handleDoubleClick = () => {
    if (isDrawing) {
      dlog('测距完成');
      isDrawing = false;
      const measureIndex = drawings.value.filter((d) => d.type === 'measure').length + 1;
      drawings.value.push({
        type: 'measure',
        name: `测距${measureIndex}`,
        data: { points, distance: totalDistance, polyline },
        id: Date.now(),
        timestamp: new Date(),
      });
    }
  };

  register({ click: handleClick, dblclick: handleDoubleClick });
}
