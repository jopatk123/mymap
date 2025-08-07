import L from 'leaflet';
import StyleRenderer from '@/services/StyleRenderer.js';
import { defaultStyles } from '@/constants/map.js';

const styleRenderer = new StyleRenderer();

export function useKmlLayer(map, kmlLayers) {
  const addKmlLayer = async (kmlFile, styleConfig = null) => {
    if (!map.value || !kmlFile.file_url) {
      console.warn('无法添加KML图层：地图未初始化或文件URL为空', { map: !!map.value, fileUrl: kmlFile.file_url });
      return null;
    }

    try {
      // 重试机制，最多重试3次
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(kmlFile.file_url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const kmlText = await response.text();
          return await processKmlText(kmlText, kmlFile, styleConfig);
        } catch (error) {
          lastError = error;
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`KML文件加载失败，${retryCount}秒后重试...`, kmlFile.file_url);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error('加载KML文件失败:', error);
      return null;
    }
  };
  
  const processKmlText = async (kmlText, kmlFile, styleConfig) => {
    try {
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
          const iconType = effectiveStyle.point_icon_type || 'circle';

          // 获取图标形状HTML
          const getIconShapeHtml = (type, size) => {
            switch (type) {
              case 'circle':
                return `<div style="
                  width: ${size * 2}px;
                  height: ${size * 2}px;
                  background-color: ${pointColor};
                  opacity: ${pointOpacity};
                  border-radius: 50%;
                  position: absolute;
                  top: 0;
                  left: 0;
                "></div>`;
              case 'square':
                return `<div style="
                  width: ${size * 2}px;
                  height: ${size * 2}px;
                  background-color: ${pointColor};
                  opacity: ${pointOpacity};
                  border-radius: 0;
                  position: absolute;
                  top: 0;
                  left: 0;
                "></div>`;
              case 'triangle':
                return `<div style="
                  width: 0;
                  height: 0;
                  border-left: ${size}px solid transparent;
                  border-right: ${size}px solid transparent;
                  border-bottom: ${size * 1.8}px solid ${pointColor};
                  opacity: ${pointOpacity};
                  position: absolute;
                  left: ${size}px;
                  top: ${size * 0.1}px;
                "></div>`;
              case 'diamond':
                return `<div style="
                  width: ${size * 2}px;
                  height: ${size * 2}px;
                  background-color: ${pointColor};
                  opacity: ${pointOpacity};
                  transform: rotate(45deg);
                  border-radius: 0;
                  position: absolute;
                  top: 0;
                  left: 0;
                "></div>`;
              case 'marker':
                const svgIcon = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3.2}" viewBox="0 0 25 41" style="position: absolute; top: -${size * 1.2}px; left: 0;">
                    <path fill="${pointColor}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${pointOpacity}"/>
                    <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
                    <circle fill="${pointColor}" cx="12.5" cy="12.5" r="3" opacity="${pointOpacity}"/>
                  </svg>
                `;
                return svgIcon;
              default:
                return `<div style="
                  width: ${size * 2}px;
                  height: ${size * 2}px;
                  background-color: ${pointColor};
                  opacity: ${pointOpacity};
                  border-radius: 50%;
                  position: absolute;
                  top: 0;
                  left: 0;
                "></div>`;
            }
          };

          // 当字体大小为0时，不显示标签，只显示点
          if (labelSize === 0) {
            // 对于简单形状，使用circleMarker性能更好
            if (iconType === 'circle') {
              return L.circleMarker(latlng, {
                  renderer: L.canvas(),
                  color: pointColor,
                  fillColor: pointColor,
                  fillOpacity: pointOpacity,
                  weight: 1,
                  radius: pointSize,
              });
            }
            
            // 对于复杂形状，使用divIcon
            const iconHtml = `
              <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
                ${getIconShapeHtml(iconType, pointSize)}
              </div>
            `;

            // 地图标记需要特殊的尺寸和锚点
            const iconSize = iconType === 'marker' ? [pointSize * 2, pointSize * 3.2] : [pointSize * 2, pointSize * 2];
            const iconAnchor = iconType === 'marker' ? [pointSize, pointSize * 3.2] : [pointSize, pointSize];

            const icon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: iconSize,
                iconAnchor: iconAnchor,
            });

            return L.marker(latlng, { icon: icon });
          }

          // 字体大小大于0时，显示点和标签
          // 计算标签位置偏移
          const getLabelPosition = (type, size, labelSize) => {
            switch (type) {
              case 'marker':
                // 地图标记：标签在图标顶部上方
                return {
                  top: `-${size * 1.2 + labelSize + 4}px`,
                  marginBottom: '2px'
                };
              case 'triangle':
                // 三角形：标签在三角形顶部上方
                return {
                  top: `-${labelSize + 4}px`,
                  marginBottom: '2px'
                };
              default:
                // 其他形状：标签在图标顶部上方
                return {
                  top: `-${labelSize + 4}px`,
                  marginBottom: '2px'
                };
            }
          };

          const labelPosition = getLabelPosition(iconType, pointSize, labelSize);

          const iconHtml = `
            <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
              <div style="
                position: absolute;
                left: 50%;
                top: ${labelPosition.top};
                transform: translateX(-50%);
                margin-bottom: ${labelPosition.marginBottom};
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
                z-index: 1000;
              ">
                ${feature.properties.name}
              </div>
              ${getIconShapeHtml(iconType, pointSize)}
            </div>
          `;

          // 地图标记需要特殊的尺寸和锚点
          const iconHeight = iconType === 'marker' ? pointSize * 3.2 : pointSize * 2;
          const totalHeight = iconHeight + labelSize + 8; // 增加标签高度和间距
          const iconSize = [pointSize * 2, totalHeight];
          
          // 调整锚点，考虑标签在上方的情况
          const anchorY = iconType === 'marker' ? 
            iconHeight + labelSize + 4 : // 地图标记：锚点在底部
            pointSize + labelSize + 4;   // 其他形状：锚点在中心偏下
          const iconAnchor = [pointSize, anchorY];

          const icon = L.divIcon({
              html: iconHtml,
              className: '',
              iconSize: iconSize,
              iconAnchor: iconAnchor,
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
