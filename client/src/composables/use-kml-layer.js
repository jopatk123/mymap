import L from 'leaflet';
import { processKmlPoints } from './kml-point-renderer.js';
import { parseKmlText } from './kml-text-parser.js';

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
            return await processKmlLayerFromPoints(pointsData.data, kmlFile, styleConfig);
          }
        }
      } catch (error) {
        console.warn('从服务端获取KML点位数据失败，回退到解析KML文件:', error);
      }

      // 回退到原始的KML文件解析方式
      return await loadAndParseKmlFile(kmlFile, styleConfig);
    } catch (error) {
      console.error('加载KML文件失败:', error);
      return null;
    }
  };

  const processKmlLayerFromPoints = async (points, kmlFile, styleConfig) => {
    const { kmlLayer, featureCount } = processKmlPoints(points, kmlFile, styleConfig);
    
    if (!kmlLayer) {
      return null;
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
  };

  const loadAndParseKmlFile = async (kmlFile, styleConfig) => {
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
        
        const { kmlLayer, featureCount } = parseKmlText(kmlText, kmlFile, styleConfig);
        
        if (!kmlLayer) {
          return null;
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
        lastError = error;
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`KML文件加载失败，${retryCount}秒后重试...`, kmlFile.file_url);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
    
    throw lastError;
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