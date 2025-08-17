import { wgs84ToGcj02, gcj02ToBd09 } from '@/utils/coordinate-transform.js';
import L from 'leaflet';
import 'leaflet.markercluster';
import { createClusterIcon } from '@/utils/map-utils.js';
import StyleRenderer from '@/services/style-renderer.js';
import { createPointIcon } from './kml-icon-factory.js';
import { processCoordinates } from './kml-data-processor.js';

export function createPointRenderer(kmlFile, effectiveStyle) {
  const styleRenderer = new StyleRenderer();

  const useCluster = Boolean(effectiveStyle?.cluster_enabled)
  const clusterColor = effectiveStyle?.cluster_color || effectiveStyle?.point_color || '#3388ff'
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
      })
    : null

  // 按是否聚合分别配置 geojson 选项
  const geoJsonOptions = {
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
  }

  if (useCluster) {
    // 聚合时由我们手动创建点，不让 geojson 生成点图层
    geoJsonOptions.filter = (feature) => (feature.geometry?.type?.toLowerCase?.() || '') !== 'point'
  } else {
    // 非聚合时，交给 geojson 的 pointToLayer 生成 marker
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
      return L.marker(latlng, { icon: L.divIcon(iconOptions) });
    }
  }

  const featureGeoJson = L.geoJSON(null, geoJsonOptions)

  const layer = useCluster && clusterGroup ? L.layerGroup([featureGeoJson, clusterGroup]) : featureGeoJson
  return { layer, featureGeoJson, useCluster, clusterGroup };
}

export function processKmlPoints(points, kmlFile, styleConfig) {
  try {
    const effectiveStyle = styleConfig || {};
    const { layer, featureGeoJson, useCluster, clusterGroup } = createPointRenderer(kmlFile, effectiveStyle);

    let featureCount = 0;

    // 批量快速添加
    const batchMarkers = []
    for (const point of points) {
      const processedFeature = processPointData(point);
      if (!processedFeature) continue;

      const geometryType = processedFeature.geometry?.type?.toLowerCase?.() || ''
      if (useCluster && clusterGroup && geometryType === 'point') {
        const coords = processedFeature.geometry.coordinates
        const latlng = L.latLng(coords[1], coords[0])
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
          processedFeature.properties?.name
        );
        const marker = L.marker(latlng, { icon: L.divIcon(iconOptions), updateWhenZoom: false })
        try {
          const popupContent = createPopupContent(processedFeature, kmlFile)
          marker.bindPopup(popupContent)
        } catch {}
        batchMarkers.push(marker)
      } else {
        // 非点要素在任何情况下都应直接添加到 geojson 图层；
        // 非聚合模式下点要素也直接添加
        featureGeoJson.addData(processedFeature);
      }
      featureCount++;
    }
    if (useCluster && clusterGroup && batchMarkers.length) {
      clusterGroup.addLayers(batchMarkers)
    }

    return { kmlLayer: layer, featureCount };
  } catch (error) {
    console.error('处理KML点位数据失败:', error);
    return { kmlLayer: null, featureCount: 0 };
  }
}

function processPointData(point) {
  if (point.point_type === 'Point') {
    const coords = processCoordinates(point);
    if (!coords) return null;

    const feature = {
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

    // 如果服务端提供原始WGS84坐标，附带到属性中用于弹窗展示
    if (point.latitude != null && point.longitude != null && !isNaN(point.latitude) && !isNaN(point.longitude)) {
      feature.properties.wgs84_lat = Number(point.latitude);
      feature.properties.wgs84_lng = Number(point.longitude);
    }

    return feature;
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

function formatWgs84(feature) {
  const lat = feature?.properties?.wgs84_lat;
  const lng = feature?.properties?.wgs84_lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  return '';
}

export function createPopupContent(feature, kmlFile) {
  const wgs84Text = formatWgs84(feature);
  // 计算外链URL
  let wgsLat = feature?.properties?.wgs84_lat;
  let wgsLng = feature?.properties?.wgs84_lng;
  let amapLng = null, amapLat = null, bmapLng = null, bmapLat = null;
  if (typeof wgsLat === 'number' && typeof wgsLng === 'number') {
    const [gcjLng, gcjLat] = wgs84ToGcj02(wgsLng, wgsLat);
    [amapLng, amapLat] = [gcjLng, gcjLat];
    [bmapLng, bmapLat] = gcj02ToBd09(gcjLng, gcjLat);
  }
  const amapUrl = (amapLng && amapLat)
    ? `https://uri.amap.com/marker?position=${amapLng.toFixed(6)},${amapLat.toFixed(6)}&name=${encodeURIComponent(feature.properties.name || '')}`
    : '';
  const bmapUrl = (bmapLng && bmapLat)
    ? `https://api.map.baidu.com/marker?location=${bmapLat.toFixed(6)},${bmapLng.toFixed(6)}&title=${encodeURIComponent(feature.properties.name || '')}&content=${encodeURIComponent(kmlFile.title || '')}&coord_type=bd09ll&output=html`
    : '';
  return `
    <div style="max-width: 240px;">
      ${feature.properties.name ? `<h4 style="margin: 0 0 8px 0;">${feature.properties.name}</h4>` : ''}
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">来源: ${kmlFile.title}</p>
      ${feature.properties.description ? `<p style="margin: 0 0 4px 0; font-size: 12px;">${feature.properties.description}</p>` : ''}
      ${wgs84Text ? `<p style=\"margin: 0 0 4px 0; font-size: 12px;\">经纬度(WGS84): ${wgs84Text}</p>` : ''}
      ${kmlFile?.description ? `<div style=\"font-size: 12px;\">备注：${kmlFile.description}</div>` : ''}
      ${(amapUrl || bmapUrl) ? `<div style=\"margin-top: 8px; display: flex; gap: 8px;\">\
        ${amapUrl ? `<a href=\"${amapUrl}\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-block;padding:4px 8px;background:#409eff;color:#fff;border-radius:3px;text-decoration:none;\">在高德地图打开</a>` : ''}\
        ${bmapUrl ? `<a href=\"${bmapUrl}\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-block;padding:4px 8px;background:#67c23a;color:#fff;border-radius:3px;text-decoration:none;\">在百度地图打开</a>` : ''}
      </div>` : ''}
    </div>
  `;
}