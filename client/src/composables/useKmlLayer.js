import L from 'leaflet';
import StyleRenderer from '@/services/StyleRenderer.js';

const styleRenderer = new StyleRenderer();

import { defaultStyles } from '@/constants/map.js';

export function useKmlLayer(map, kmlLayers) {
  const addKmlLayer = async (kmlFile, styleConfig = null) => {
    if (!map.value || !kmlFile.file_url) {
      console.warn('无法添加KML图层：地图未初始化或文件URL为空', { map: !!map.value, fileUrl: kmlFile.file_url });
      return null;
    }

    try {
      const response = await fetch(kmlFile.file_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const kmlText = await response.text();
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
      const parseError = kmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        throw new Error('KML文件解析失败: ' + parseError[0].textContent);
      }

      const effectiveStyle = { ...defaultStyles, ...(styleConfig || {}) };

      const kmlLayer = L.geoJSON(null, {
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

          // 当字体大小为0时，不显示标签，只显示点
          if (labelSize === 0) {
            return L.circleMarker(latlng, {
                renderer: L.canvas(),
                color: pointColor,
                fillColor: pointColor,
                fillOpacity: pointOpacity,
                weight: 1,
                radius: pointSize,
            });
          }

          // 字体大小大于0时，显示点和标签
          const iconHtml = `
            <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: ${pointSize * 2}px;
                height: ${pointSize * 2}px;
                background-color: ${pointColor};
                opacity: ${pointOpacity};
                border-radius: 50%;
              "></div>
              <div style="
                position: absolute;
                left: 50%;
                top: 100%;
                transform: translateX(-50%);
                margin-top: 2px;
                padding: 2px 5px;
                background-color: rgba(255, 255, 255, 0.75);
                border-radius: 3px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                white-space: nowrap;
                font-weight: 500;
                text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
                font-size: ${labelSize}px;
                color: ${labelColor};
                writing-mode: horizontal-tb !important;
                text-orientation: mixed !important;
                display: inline-block !important;
                font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
              ">
                ${feature.properties.name}
              </div>
            </div>
          `;

          const icon = L.divIcon({
              html: iconHtml,
              className: '',
              iconSize: [pointSize * 2, pointSize * 2 + labelSize + 5],
              iconAnchor: [pointSize, pointSize],
          });

          return L.marker(latlng, { icon: icon });
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && (feature.properties.name || feature.properties.description)) {
            const popupContent = `
              <div style="max-width: 200px;">
                ${feature.properties.name ? `<h4 style="margin: 0 0 8px 0;">${feature.properties.name}</h4>` : ''}
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">来源: ${kmlFile.title}</p>
                ${feature.properties.description ? `<div style="font-size: 12px;">${feature.properties.description}</div>` : ''}
              </div>
            `;
            layer.bindPopup(popupContent);
          }
        },
      });

      let featureCount = 0;
      const placemarks = kmlDoc.getElementsByTagName('Placemark');

      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];
        let name = placemark.getElementsByTagName('name')[0]?.textContent || placemark.getElementsByTagName('n')[0]?.textContent || `地标${i + 1}`;
        const description = placemark.getElementsByTagName('description')[0]?.textContent || '';

        // Points
        const points = placemark.getElementsByTagName('Point');
        for (let j = 0; j < points.length; j++) {
          const coordinates = points[j].getElementsByTagName('coordinates')[0]?.textContent;
          if (coordinates) {
            const [lng, lat] = coordinates.trim().split(',').map(parseFloat);
            if (!isNaN(lat) && !isNaN(lng)) {
              kmlLayer.addData({ type: 'Feature', properties: { name, description }, geometry: { type: 'Point', coordinates: [lng, lat] } });
              featureCount++;
            }
          }
        }

        // LineStrings
        const lineStrings = placemark.getElementsByTagName('LineString');
        for (let j = 0; j < lineStrings.length; j++) {
          const coordinates = lineStrings[j].getElementsByTagName('coordinates')[0]?.textContent;
          if (coordinates) {
            const lineCoords = coordinates.trim().split(/\s+/).map(pair => pair.split(',').map(parseFloat)).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
            if (lineCoords.length > 1) {
              kmlLayer.addData({ type: 'Feature', properties: { name, description }, geometry: { type: 'LineString', coordinates: lineCoords } });
              featureCount++;
            }
          }
        }

        // Polygons
        const polygons = placemark.getElementsByTagName('Polygon');
        for (let j = 0; j < polygons.length; j++) {
          const outerBoundary = polygons[j].getElementsByTagName('outerBoundaryIs')[0];
          if (outerBoundary) {
            const coordinates = outerBoundary.getElementsByTagName('coordinates')[0]?.textContent;
            if (coordinates) {
              const polygonCoords = coordinates.trim().split(/\s+/).map(pair => pair.split(',').map(parseFloat)).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
              if (polygonCoords.length > 2) {
                kmlLayer.addData({ type: 'Feature', properties: { name, description }, geometry: { type: 'Polygon', coordinates: [polygonCoords] } });
                featureCount++;
              }
            }
          }
        }
      }

      if (featureCount > 0) {
        kmlLayer.addTo(map.value);
        kmlLayers.value.push({ id: kmlFile.id, layer: kmlLayer, title: kmlFile.title });
        return kmlLayer;
      } else {
        console.warn('KML文件中没有找到有效的几何要素');
        return null;
      }
    } catch (error) {
      console.error('加载KML文件失败:', error);
      return null;
    }
  };

  const addKmlLayers = (kmlFiles) => {
    kmlFiles.forEach(kmlFile => addKmlLayer(kmlFile, kmlFile.styleConfig));
  };

  const removeKmlLayer = (id) => {
    const layerIndex = kmlLayers.value.findIndex((l) => l.id === id);
    if (layerIndex > -1) {
      const { layer } = kmlLayers.value[layerIndex];
      map.value.removeLayer(layer);
      kmlLayers.value.splice(layerIndex, 1);
    }
  };

  const clearKmlLayers = () => {
    kmlLayers.value.forEach(({ layer }) => {
      map.value.removeLayer(layer);
    });
    kmlLayers.value = [];
  };

  return {
    addKmlLayer,
    addKmlLayers,
    removeKmlLayer,
    clearKmlLayers,
  };
}
