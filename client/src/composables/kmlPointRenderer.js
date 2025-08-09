import L from 'leaflet';
import StyleRenderer from '@/services/StyleRenderer.js';
import { createPointIcon } from './kmlIconFactory.js';
import { processCoordinates } from './kmlDataProcessor.js';

export function createPointRenderer(kmlFile, effectiveStyle) {
  const styleRenderer = new StyleRenderer();

  const kmlLayer = L.geoJSON(null, {
    // 为非点要素提供样式（线与面）
    style: (feature) => {
      const geometryType = feature.geometry.type.toLowerCase();
      if (geometryType.includes('line')) {
        return styleRenderer.renderLineStyle(feature, effectiveStyle);
      }
      if (geometryType.includes('polygon')) {
        return styleRenderer.renderPolygonStyle(feature, effectiveStyle);
      }
      return {};
    },
    // 点要素使用自定义图标
    pointToLayer: (feature, latlng) => {
      const pointSize = effectiveStyle.point_size;
      const labelSize = Number(effectiveStyle.point_label_size);
      const pointColor = effectiveStyle.point_color;
      const labelColor = effectiveStyle.point_label_color;
      const pointOpacity = effectiveStyle.point_opacity;

      const iconOptions = createPointIcon(
        pointSize,
        pointColor,
        pointOpacity,
        labelSize,
        labelColor,
        feature.properties.name
      );

      return L.marker(latlng, { icon: L.divIcon(iconOptions) });
    },
    onEachFeature: (feature, layer) => {
      if (feature.properties && (feature.properties.name || feature.properties.description)) {
        const popupContent = createPopupContent(feature, kmlFile);
        layer.bindPopup(popupContent);
      }
    },
  });

  return kmlLayer;
}

export function processKmlPoints(points, kmlFile, styleConfig) {
  try {
    const effectiveStyle = styleConfig || {};
    const kmlLayer = createPointRenderer(kmlFile, effectiveStyle);

    let featureCount = 0;

    for (const point of points) {
      const processedFeature = processPointData(point);
      if (processedFeature) {
        kmlLayer.addData(processedFeature);
        featureCount++;
      }
    }

    return { kmlLayer, featureCount };
  } catch (error) {
    console.error('处理KML点位数据失败:', error);
    return { kmlLayer: null, featureCount: 0 };
  }
}

function processPointData(point) {
  if (point.point_type === 'Point') {
    const coords = processCoordinates(point);
    if (!coords) return null;

    return {
      type: 'Feature',
      properties: {
        name: point.name || '未命名地标',
        description: point.description || ''
      },
      geometry: {
        type: 'Point',
        coordinates: [coords.lng, coords.lat]
      }
    };
  } else if (point.point_type === 'LineString' && point.coordinates && point.coordinates.points) {
    const lineCoords = processCoordinates(point.coordinates.points);
    if (!lineCoords || lineCoords.length <= 1) return null;

    return {
      type: 'Feature',
      properties: {
        name: point.name || '未命名线条',
        description: point.description || ''
      },
      geometry: {
        type: 'LineString',
        coordinates: lineCoords
      }
    };
  } else if (point.point_type === 'Polygon' && point.coordinates && point.coordinates.outer) {
    const polygonCoords = processCoordinates(point.coordinates.outer);
    if (!polygonCoords || polygonCoords.length <= 2) return null;

    return {
      type: 'Feature',
      properties: {
        name: point.name || '未命名多边形',
        description: point.description || ''
      },
      geometry: {
        type: 'Polygon',
        coordinates: [polygonCoords]
      }
    };
  }

  return null;
}

function createPopupContent(feature, kmlFile) {
  return `
    <div style="max-width: 200px;">
      ${feature.properties.name ? `<h4 style="margin: 0 0 8px 0;">${feature.properties.name}</h4>` : ''}
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">来源: ${kmlFile.title}</p>
      ${feature.properties.description ? `<div style="font-size: 12px;">${feature.properties.description}</div>` : ''}
    </div>
  `;
}