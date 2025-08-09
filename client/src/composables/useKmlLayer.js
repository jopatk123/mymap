import L from 'leaflet';
import StyleRenderer from '@/services/StyleRenderer.js';
import { defaultStyles } from '@/constants/map.js';
import { getDisplayCoordinates, wgs84ToGcj02 } from '@/utils/coordinate-transform.js';

const styleRenderer = new StyleRenderer();

export function useKmlLayer(map, kmlLayers) {
  const addKmlLayer = async (kmlFile, styleConfig = null) => {
    if (!map.value || !kmlFile.file_url) {
      console.warn('无法添加KML图层：地图未初始化或文件URL为空', { map: !!map.value, fileUrl: kmlFile.file_url });
      return null;
    }

    try {
      // 优先从服务端获取已转换的坐标数据
      try {
        const pointsResponse = await fetch(`/api/kml-files/${kmlFile.id}/points`);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          if (pointsData.success && pointsData.data && pointsData.data.length > 0) {
            return await processKmlPoints(pointsData.data, kmlFile, styleConfig);
          }
        }
      } catch (error) {
        console.warn('从服务端获取KML点位数据失败，回退到解析KML文件:', error);
      }

      // 回退到原始的KML文件解析方式
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
  
  // 处理服务端返回的KML点位数据（已转换坐标）
  const processKmlPoints = async (points, kmlFile, styleConfig) => {
    try {
      const effectiveStyle = { ...defaultStyles, ...(styleConfig || {}) };

      const kmlLayer = L.geoJSON(null, {
        pointToLayer: (feature, latlng) => {
          const pointSize = effectiveStyle.point_size;
          const labelSize = Number(effectiveStyle.point_label_size);
          const pointColor = effectiveStyle.point_color;
          const labelColor = effectiveStyle.point_label_color;
          const pointOpacity = effectiveStyle.point_opacity;
          
          // 获取图标形状HTML - 固定使用marker形状
          const getIconShapeHtml = (size) => {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3.2}" viewBox="0 0 25 41" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path fill="${pointColor}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${pointOpacity}"/>
              <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
              <circle fill="${pointColor}" cx="12.5" cy="12.5" r="3" opacity="${pointOpacity}"/>
            </svg>`;
          };

          // 当字体大小为0时，不显示标签，只显示点
          if (labelSize === 0) {
            const iconHtml = `
              <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
                ${getIconShapeHtml(pointSize)}
              </div>
            `;

            const iconSize = [pointSize * 2, pointSize * 3.2];
            const iconAnchor = [pointSize, pointSize * 3.2];

            const icon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: iconSize,
                iconAnchor: iconAnchor,
            });

            return L.marker(latlng, { icon: icon });
          }

          // 字体大小大于0时，显示点和标签
          const getLabelPosition = (size, labelSize) => {
            return {
              top: `-${size * 1.2 + labelSize + 4}px`,
              marginBottom: '2px'
            };
          };

          const labelPosition = getLabelPosition(pointSize, labelSize);

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
              ${getIconShapeHtml(pointSize)}
            </div>
          `;

          const iconHeight = pointSize * 3.2;
          const totalHeight = iconHeight + labelSize + 8;
          const iconSize = [pointSize * 2, totalHeight];
          
          const anchorY = iconHeight + labelSize + 4;
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

      // 处理服务端返回的点位数据
      for (const point of points) {
        if (point.point_type === 'Point') {
          let displayLat, displayLng;
          
          // 优先使用原始WGS84坐标（如果存在），转换为GCJ02
          if (point.latitude != null && point.longitude != null) {
            const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(point.longitude, point.latitude);
            displayLat = gcj02Lat;
            displayLng = gcj02Lng;

          }
          // 如果没有原始坐标，直接使用GCJ02坐标
          else if (point.gcj02_lat != null && point.gcj02_lng != null) {
            displayLat = point.gcj02_lat;
            displayLng = point.gcj02_lng;

          }
          
          if (displayLat != null && displayLng != null && !isNaN(displayLat) && !isNaN(displayLng)) {
            kmlLayer.addData({
              type: 'Feature',
              properties: {
                name: point.name || '未命名地标',
                description: point.description || ''
              },
              geometry: {
                type: 'Point',
                coordinates: [displayLng, displayLat]
              }
            });
            featureCount++;
          }
        }
      }

      if (featureCount > 0) {
        kmlLayer.addTo(map.value);
        kmlLayers.value.push({ id: kmlFile.id, layer: kmlLayer, title: kmlFile.title });
        console.log(`✅ KML图层加载成功 (${kmlFile.title}): ${featureCount} 个要素`);
        return kmlLayer;
      } else {
        console.warn('KML文件中没有找到有效的点位要素');
        return null;
      }
    } catch (error) {
      console.error('处理KML点位数据失败:', error);
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
          // 获取图标形状HTML - 固定使用marker形状
          const getIconShapeHtml = (size) => {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3.2}" viewBox="0 0 25 41" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path fill="${pointColor}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${pointOpacity}"/>
              <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
              <circle fill="${pointColor}" cx="12.5" cy="12.5" r="3" opacity="${pointOpacity}"/>
            </svg>`;
          };

          // 当字体大小为0时，不显示标签，只显示点
          if (labelSize === 0) {
            const iconHtml = `
              <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
                ${getIconShapeHtml(pointSize)}
              </div>
            `;

            // 地图标记固定使用marker尺寸和锚点
            const iconSize = [pointSize * 2, pointSize * 3.2];
            const iconAnchor = [pointSize, pointSize * 3.2];

            const icon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: iconSize,
                iconAnchor: iconAnchor,
            });

            return L.marker(latlng, { icon: icon });
          }

          // 字体大小大于0时，显示点和标签
          // 计算标签位置偏移 - 固定使用marker位置
          const getLabelPosition = (size, labelSize) => {
            return {
              top: `-${size * 1.2 + labelSize + 4}px`,
              marginBottom: '2px'
            };
          };

          const labelPosition = getLabelPosition(pointSize, labelSize);

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
              ${getIconShapeHtml(pointSize)}
            </div>
          `;

          // 地图标记固定使用marker尺寸和锚点
          const iconHeight = pointSize * 3.2;
          const totalHeight = iconHeight + labelSize + 8; // 增加标签高度和间距
          const iconSize = [pointSize * 2, totalHeight];
          
          // 调整锚点，考虑标签在上方的情况
          const anchorY = iconHeight + labelSize + 4; // 地图标记：锚点在底部
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
              // 将WGS84坐标转换为GCJ02坐标（适配高德地图瓦片）
              const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(lng, lat);

              kmlLayer.addData({ type: 'Feature', properties: { name, description }, geometry: { type: 'Point', coordinates: [gcj02Lng, gcj02Lat] } });
              featureCount++;
            }
          }
        }

        // LineStrings
        const lineStrings = placemark.getElementsByTagName('LineString');
        for (let j = 0; j < lineStrings.length; j++) {
          const coordinates = lineStrings[j].getElementsByTagName('coordinates')[0]?.textContent;
          if (coordinates) {
            const lineCoords = coordinates.trim().split(/\s+/).map(pair => {
              const [lng, lat] = pair.split(',').map(parseFloat);
              return [lng, lat];
            }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
            
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
              const polygonCoords = coordinates.trim().split(/\s+/).map(pair => {
                const [lng, lat] = pair.split(',').map(parseFloat);
                return [lng, lat];
              }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
              
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
        console.log(`✅ KML图层加载成功 (${kmlFile.title}): ${featureCount} 个要素`);
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
