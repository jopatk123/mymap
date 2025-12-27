import L from 'leaflet';
import 'leaflet.markercluster';
import { createClusterIcon } from '@/utils/map-utils.js';
import StyleRenderer from '@/services/style-renderer.js';
import { createPointIcon } from './kml-icon-factory.js';
import { extractCoordinatesFromText, createFeatureData } from './kml-data-processor.js';
import { wgs84ToGcj02, gcj02ToBd09 } from '@/utils/coordinate-transform.js';

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
    const { layer, featureGeoJson, clusterGroup, useCluster } = createKmlLayer(
      kmlFile,
      effectiveStyle
    );

    let featureCount = 0;
    const placemarks = kmlDoc.getElementsByTagName('Placemark');

    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const featureData = extractPlacemarkData(placemark, i);

      if (featureData) {
        featureCount += addPlacemarkFeatures(
          featureGeoJson,
          featureData,
          effectiveStyle,
          clusterGroup,
          useCluster,
          kmlFile
        );
      }
    }

    return { kmlLayer: layer, featureCount };
  } catch (error) {
    console.error('解析KML文件失败:', error);
    return { kmlLayer: null, featureCount: 0 };
  }
}

function createKmlLayer(kmlFile, effectiveStyle) {
  const useCluster = Boolean(effectiveStyle?.cluster_enabled);
  const clusterColor = effectiveStyle?.cluster_color || effectiveStyle?.point_color || '#3388ff';
  const clusterGroup = useCluster
    ? L.markerClusterGroup({
        iconCreateFunction: (cluster) => createClusterIcon(clusterColor, cluster.getChildCount()),
        chunkedLoading: true,
        chunkInterval: 50,
        chunkDelay: 20,
        removeOutsideVisibleBounds: true,
        disableClusteringAtZoom: 19,
        spiderfyOnEveryClick: false,
        animate: false,
        pane: 'kmlPane',
      })
    : null;

  // 用于承载点/线/面的 geojson
  const geoJsonOptions = {
    pane: 'kmlPane',
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
    onEachFeature: (feature, layer) => {
      if (feature.properties && (feature.properties.name || feature.properties.description)) {
        const popupContent = createPopupContent(feature, kmlFile);
        layer.bindPopup(popupContent);
      }
    },
  };

  if (useCluster && clusterGroup) {
    geoJsonOptions.filter = (feature) =>
      (feature.geometry?.type?.toLowerCase?.() || '') !== 'point';
  } else {
    geoJsonOptions.pointToLayer = (feature, latlng) => {
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
      return L.marker(latlng, { icon: L.divIcon(iconOptions), pane: 'kmlPane' });
    };
  }

  const featureGeoJson = L.geoJSON(null, geoJsonOptions);

  const layer =
    useCluster && clusterGroup ? L.layerGroup([featureGeoJson, clusterGroup]) : featureGeoJson;
  return { layer, featureGeoJson, clusterGroup, useCluster };
}

function extractPlacemarkData(placemark, index) {
  const name =
    placemark.getElementsByTagName('name')[0]?.textContent ||
    placemark.getElementsByTagName('n')[0]?.textContent ||
    `地标${index + 1}`;
  const description = placemark.getElementsByTagName('description')[0]?.textContent || '';

  return {
    name,
    description,
    points: extractPoints(placemark),
    lineStrings: extractLineStrings(placemark),
    polygons: extractPolygons(placemark),
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
          result.push({ gcj02: coords, wgs84: { lat, lng } });
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

function addPlacemarkFeatures(
  featureGeoJson,
  featureData,
  effectiveStyle,
  clusterGroup,
  useCluster,
  kmlFile
) {
  let featureCount = 0;

  // 添加点（同时附带原始WGS84坐标用于弹窗展示）
  const batchMarkers = [];
  featureData.points.forEach((point) => {
    const coordinates = Array.isArray(point) ? point : point.gcj02;
    const wgs84LatLng = Array.isArray(point) ? null : point.wgs84;
    if (useCluster && clusterGroup) {
      const latlng = L.latLng(coordinates[1], coordinates[0]);
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
        featureData.name
      );
      const marker = L.marker(latlng, { icon: L.divIcon(iconOptions), updateWhenZoom: false });
      try {
        // 构造最小要素用于生成弹窗内容
        const feature = createFeatureData(
          featureData.name,
          featureData.description,
          'Point',
          [coordinates[0], coordinates[1]],
          wgs84LatLng
        );
        const popupContent = createPopupContent(feature, kmlFile);
        marker.bindPopup(popupContent);
      } catch {}
      batchMarkers.push(marker);
    } else {
      featureGeoJson.addData(
        createFeatureData(
          featureData.name,
          featureData.description,
          'Point',
          coordinates,
          wgs84LatLng
        )
      );
    }
    featureCount++;
  });
  if (useCluster && clusterGroup && batchMarkers.length) {
    clusterGroup.addLayers(batchMarkers);
  }

  // 添加线
  featureData.lineStrings.forEach((coords) => {
    featureGeoJson.addData(
      createFeatureData(featureData.name, featureData.description, 'LineString', coords)
    );
    featureCount++;
  });

  // 添加多边形
  featureData.polygons.forEach((coords) => {
    featureGeoJson.addData(
      createFeatureData(featureData.name, featureData.description, 'Polygon', [coords])
    );
    featureCount++;
  });

  return featureCount;
}

function formatWgs84(feature) {
  const lat = feature?.properties?.wgs84_lat;
  const lng = feature?.properties?.wgs84_lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  return '';
}

function createPopupContent(feature, kmlFile) {
  const wgs84Text = formatWgs84(feature);
  // 计算外链URL
  let wgsLat = feature?.properties?.wgs84_lat;
  let wgsLng = feature?.properties?.wgs84_lng;
  let amapLng = null,
    amapLat = null,
    bmapLng = null,
    bmapLat = null;
  if (typeof wgsLat === 'number' && typeof wgsLng === 'number') {
    const [gcjLng, gcjLat] = wgs84ToGcj02(wgsLng, wgsLat);
    [amapLng, amapLat] = [gcjLng, gcjLat];
    [bmapLng, bmapLat] = gcj02ToBd09(gcjLng, gcjLat);
  }
  const amapUrl =
    amapLng && amapLat
      ? `https://uri.amap.com/marker?position=${amapLng.toFixed(6)},${amapLat.toFixed(
          6
        )}&name=${encodeURIComponent(feature.properties.name || '')}&coordinate=gaode`
      : '';
  const bmapUrl =
    amapLng && amapLat
      ? `https://api.map.baidu.com/marker?location=${amapLat.toFixed(6)},${amapLng.toFixed(
          6
        )}&title=${encodeURIComponent(feature.properties.name || '')}&content=${encodeURIComponent(
          kmlFile.title || ''
        )}&coord_type=gcj02&output=html`
      : '';
  return `
    <div style="max-width: 240px;">
      ${feature.properties.name ? `<h4 class="popup-title">${feature.properties.name}</h4>` : ''}
      <p class="popup-meta">来源: ${kmlFile.title}</p>
      ${
        feature.properties.description
          ? `<p class="popup-meta">${feature.properties.description}</p>`
          : ''
      }
      ${wgs84Text ? `<p class="popup-meta">经纬度(WGS84): ${wgs84Text}</p>` : ''}
      ${kmlFile?.description ? `<div class="popup-meta">备注：${kmlFile.description}</div>` : ''}
      ${
        amapUrl || bmapUrl
          ? `<div class="popup-actions">
        ${
          amapUrl
            ? `<a class="map-btn gaode" href="${amapUrl}" target="_blank" rel="noopener">在高德地图打开</a>`
            : ''
        }
        ${
          bmapUrl
            ? `<a class="map-btn baidu" href="${bmapUrl}" target="_blank" rel="noopener">在百度地图打开</a>`
            : ''
        }
      </div>`
          : ''
      }
    </div>
  `;
}
