import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';
import { getTypeLabel } from '../utils/shared.js';

function getDrawingPoint(drawing) {
  return drawing?.data?.latlng || drawing?.latlng || null;
}

function getDrawingPoints(drawing) {
  return (
    drawing?.data?.points || drawing?.data?.latlngs || drawing?.latlngs || drawing?.points || []
  );
}

export function generateGeoJSON(drawings) {
  const features = drawings.map((drawing) => {
    let geometry = {};
    switch (drawing.type) {
      case 'point': {
        const pt = getDrawingPoint(drawing);
        if (!pt) break;
        const [lngW, latW] = gcj02ToWgs84(pt.lng, pt.lat);
        geometry = { type: 'Point', coordinates: [lngW, latW] };
        break;
      }
      case 'line':
      case 'measure': {
        const points = getDrawingPoints(drawing);
        geometry = {
          type: 'LineString',
          coordinates: points.map((p) => {
            if (!p) return [0, 0];
            const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat);
            return [lngW, latW];
          }),
        };
        break;
      }
      case 'polygon': {
        const points = getDrawingPoints(drawing);
        const coords = points.map((p) => {
          if (!p) return [0, 0];
          const [lngW, latW] = gcj02ToWgs84(p.lng, p.lat);
          return [lngW, latW];
        });
        if (coords.length > 0) coords.push(coords[0]);
        geometry = { type: 'Polygon', coordinates: [coords] };
        break;
      }
      default:
        break;
    }

    const properties = {
      name: drawing.name || '未命名',
      type: drawing.type,
      typeLabel: getTypeLabel(drawing.type),
      id: drawing.id,
      timestamp: drawing.timestamp?.toISOString(),
    };
    if (drawing.data?.distance) {
      properties.distance = drawing.data.distance;
      properties.distanceText = `${drawing.data.distance.toFixed(2)}米`;
    }

    return { type: 'Feature', geometry, properties };
  });

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      features,
      crs: { type: 'name', properties: { name: 'WGS84' } },
      metadata: {
        generated: new Date().toISOString(),
        count: drawings.length,
        generator: '地图绘图工具',
        coordinateSystem: 'WGS84',
      },
    },
    null,
    2
  );
}
