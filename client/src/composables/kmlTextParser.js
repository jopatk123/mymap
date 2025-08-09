import L from 'leaflet';
import StyleRenderer from '@/services/StyleRenderer.js';
import { createPointIcon } from './kmlIconFactory.js';
import { extractCoordinatesFromText, createFeatureData } from './kmlDataProcessor.js';

const styleRenderer = new StyleRenderer();

export function parseKmlText(kmlText, kmlFile, styleConfig) {
  try {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const parseError = kmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      throw new Error('KML文件解析失败: ' + parseError[0].textContent);
    }

    const effectiveStyle = styleConfig || {};
    const kmlLayer = createKmlLayer(kmlFile, effectiveStyle);

    let featureCount = 0;
    const placemarks = kmlDoc.getElementsByTagName('Placemark');

    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const featureData = extractPlacemarkData(placemark, i);
      
      if (featureData) {
        featureCount += addPlacemarkFeatures(kmlLayer, featureData);
      }
    }

    return { kmlLayer, featureCount };
  } catch (error) {
    console.error('解析KML文件失败:', error);
    return { kmlLayer: null, featureCount: 0 };
  }
}

function createKmlLayer(kmlFile, effectiveStyle) {
  return L.geoJSON(null, {
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
}

function extractPlacemarkData(placemark, index) {
  const name = placemark.getElementsByTagName('name')[0]?.textContent || 
               placemark.getElementsByTagName('n')[0]?.textContent || 
               `地标${index + 1}`;
  const description = placemark.getElementsByTagName('description')[0]?.textContent || '';

  return {
    name,
    description,
    points: extractPoints(placemark),
    lineStrings: extractLineStrings(placemark),
    polygons: extractPolygons(placemark)
  };
}

function extractPoints(placemark) {
  const points = placemark.getElementsByTagName('Point');
  const result = [];
  
  for (let j = 0; j < points.length; j++) {
    const coordinates = points[j].getElementsByTagName('coordinates')[0]?.textContent;
    if (coordinates) {
      const [lng, lat] = coordinates.trim().split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        const coords = extractCoordinatesFromText(coordinates)[0];
        if (coords) {
          result.push(coords);
        }
      }
    }
  }
  
  return result;
}

function extractLineStrings(placemark) {
  const lineStrings = placemark.getElementsByTagName('LineString');
  const result = [];
  
  for (let j = 0; j < lineStrings.length; j++) {
    const coordinates = lineStrings[j].getElementsByTagName('coordinates')[0]?.textContent;
    if (coordinates) {
      const coords = extractCoordinatesFromText(coordinates);
      if (coords.length > 1) {
        result.push(coords);
      }
    }
  }
  
  return result;
}

function extractPolygons(placemark) {
  const polygons = placemark.getElementsByTagName('Polygon');
  const result = [];
  
  for (let j = 0; j < polygons.length; j++) {
    const outerBoundary = polygons[j].getElementsByTagName('outerBoundaryIs')[0];
    if (outerBoundary) {
      const coordinates = outerBoundary.getElementsByTagName('coordinates')[0]?.textContent;
      if (coordinates) {
        const coords = extractCoordinatesFromText(coordinates);
        if (coords.length > 2) {
          result.push(coords);
        }
      }
    }
  }
  
  return result;
}

function addPlacemarkFeatures(kmlLayer, featureData) {
  let featureCount = 0;

  // 添加点
  featureData.points.forEach(coords => {
    kmlLayer.addData(createFeatureData(featureData.name, featureData.description, 'Point', coords));
    featureCount++;
  });

  // 添加线
  featureData.lineStrings.forEach(coords => {
    kmlLayer.addData(createFeatureData(featureData.name, featureData.description, 'LineString', coords));
    featureCount++;
  });

  // 添加多边形
  featureData.polygons.forEach(coords => {
    kmlLayer.addData(createFeatureData(featureData.name, featureData.description, 'Polygon', [coords]));
    featureCount++;
  });

  return featureCount;
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