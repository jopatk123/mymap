import { processKmlPoints } from './kml-point-renderer.js';
import { parseKmlText } from './kml-text-parser.js';
import { createKmlViewportRenderer } from './kml/kml-viewport-renderer.js';
import { isBasemapKml } from './kml/kml-utils.js';

export function useKmlLayer(map, kmlLayers) {
  const VIEWPORT_THRESHOLD = 1200;
  const VIEWPORT_PADDING = 0.2;
  const kmlViewportStates = new Map(); // kmlId -> { enabled, clusterGroup, sourcePoints, style, onMoveEnd, onZoomEnd }

  const addKmlLayer = async (kmlFile, styleConfig = null) => {
    const _isBasemap = isBasemapKml(kmlFile);
    // intentionally reference to avoid linter "assigned but never used" when value is only for callers
    void _isBasemap;
    if (!map.value || !kmlFile.file_url) {
      void console.warn('无法添加KML图层：地图未初始化或文件URL为空', {
        map: !!map.value,
        fileUrl: kmlFile.file_url,
      });
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
        // non-fatal: fetch from server failed, fallback to parsing file directly
        void console.warn('从服务端获取KML点位数据失败，回退到解析KML文件:', error);
      }

      // 回退到原始的KML文件解析方式
      return await loadAndParseKmlFile(kmlFile, styleConfig);
    } catch (error) {
      void console.error('加载KML文件失败:', error);
      return null;
    }
  };

  const processKmlLayerFromPoints = async (points, kmlFile, styleConfig) => {
    const _isBasemap = isBasemapKml(kmlFile);
    try {
      const useViewport =
        Boolean(styleConfig?.cluster_enabled) &&
        Array.isArray(points) &&
        points.length >= VIEWPORT_THRESHOLD;
      if (useViewport) {
        const viewportRenderer = createKmlViewportRenderer({
          map,
          kmlFile,
          styleConfig,
          points,
          viewportPadding: VIEWPORT_PADDING,
        });
        if (!viewportRenderer) return null;
        const { layer, clusterGroup, addVisibleMarkers, buildSpatialIndex, onMoveEnd, onZoomEnd, onZoomStart } =
          viewportRenderer;

        // 对于标记为底图的 KML，默认不把点位渲染到地图上（保留图层对象用于后续切换可见性）
        if (!_isBasemap) {
          layer.addTo(map.value);
          addVisibleMarkers();
          map.value.on('zoomstart', onZoomStart);
          map.value.on('zoomend', onZoomEnd);
          map.value.on('moveend', onMoveEnd);
        }
        // 异步构建索引，避免阻塞UI
        setTimeout(() => {
          try {
            buildSpatialIndex();
          } catch {}
        }, 0);
        kmlViewportStates.set(kmlFile.id, {
          enabled: !_isBasemap,
          clusterGroup,
          sourcePoints: points,
          style: styleConfig,
          onMoveEnd,
          onZoomEnd,
          onZoomStart,
        });
        kmlLayers.value.push({ id: kmlFile.id, layer, title: kmlFile.title, visible: !_isBasemap });
        // debug: viewport clipping rendering enabled (suppressed)
        return layer;
      }

      // 常规路径：直接处理全部点（已优化为批量和分片）
      const { kmlLayer, featureCount } = processKmlPoints(points, kmlFile, styleConfig);
      if (!kmlLayer) return null;
      if (featureCount > 0) {
        // 底图默认不将点位加入地图
        if (!_isBasemap) {
          kmlLayer.addTo(map.value);
        }
        kmlLayers.value.push({
          id: kmlFile.id,
          layer: kmlLayer,
          title: kmlFile.title,
          visible: !_isBasemap,
        });
        return kmlLayer;
      }
      void console.warn('KML文件中没有找到有效的几何要素');
      return null;
    } catch (e) {
      void console.warn('处理KML点位视口渲染失败:', e);
      return null;
    }
  };

  const loadAndParseKmlFile = async (kmlFile, styleConfig) => {
    const _isBasemap = Boolean(
      kmlFile?.isBasemap === true ||
        kmlFile?.is_basemap === 1 ||
        kmlFile?.is_basemap === true ||
        kmlFile?.isBasemap === 1
    );
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
          // 如果是底图则默认不把点位显示到地图
          if (!_isBasemap) {
            kmlLayer.addTo(map.value);
          }
          kmlLayers.value.push({
            id: kmlFile.id,
            layer: kmlLayer,
            title: kmlFile.title,
            visible: !_isBasemap,
          });
          return kmlLayer;
        } else {
          void console.warn('KML文件中没有找到有效的几何要素');
          return null;
        }
      } catch (error) {
        lastError = error;
        retryCount++;
        if (retryCount < maxRetries) {
          // debug: KML file load failed, retry suppressed
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    throw lastError;
  };

  const addKmlLayers = (kmlFiles) => {
    kmlFiles.forEach((kmlFile) => addKmlLayer(kmlFile, kmlFile.styleConfig));
  };

  const removeKmlLayer = (id) => {
    // id is used for lookup; ensure linter doesn't flag it in certain contexts
    const layerIndex = kmlLayers.value.findIndex((l) => l.id === id);
    if (layerIndex > -1) {
      const { layer } = kmlLayers.value[layerIndex];
      map.value.removeLayer(layer);
      kmlLayers.value.splice(layerIndex, 1);
      // 清理视口裁剪监听
      const vs = kmlViewportStates.get(id);
      if (vs) {
        try {
          if (vs.onMoveEnd) map.value.off('moveend', vs.onMoveEnd);
          if (vs.onZoomEnd) map.value.off('zoomend', vs.onZoomEnd);
        } catch {}
        kmlViewportStates.delete(id);
        // debug: viewport clipping rendering closed (suppressed)
      }
    }
  };

  const clearKmlLayers = () => {
    kmlLayers.value.forEach(({ layer }) => {
      map.value.removeLayer(layer);
    });
    kmlLayers.value = [];
    // 清理所有KML视口裁剪监听
    kmlViewportStates.forEach((vs, _id) => {
      try {
        if (vs.onMoveEnd) map.value.off('moveend', vs.onMoveEnd);
        if (vs.onZoomEnd) map.value.off('zoomend', vs.onZoomEnd);
      } catch {}
    });
    kmlViewportStates.clear();
  };

  return {
    addKmlLayer,
    addKmlLayers,
    removeKmlLayer,
    clearKmlLayers,
  };
}
