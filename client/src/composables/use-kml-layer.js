import L from 'leaflet';
import { processKmlPoints, createPointRenderer } from './kml-point-renderer.js';
import { parseKmlText } from './kml-text-parser.js';
import { processCoordinates } from './kml-data-processor.js'
import { createPointIcon } from './kml-icon-factory.js';

export function useKmlLayer(map, kmlLayers) {
  const VIEWPORT_THRESHOLD = 1200
  const VIEWPORT_PADDING = 0.2
  const kmlViewportStates = new Map() // kmlId -> { enabled, clusterGroup, sourcePoints, style, onMoveEnd, onZoomEnd }

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
    try {
      const useViewport = Boolean(styleConfig?.cluster_enabled) && Array.isArray(points) && points.length >= VIEWPORT_THRESHOLD
      if (useViewport) {
        // 使用只渲染线/面 + 空聚合组，由我们填充视口内点
        const renderer = createPointRenderer(kmlFile, styleConfig)
        const { layer, clusterGroup } = renderer
        if (!layer) return null

        // 维护差异集，避免 clearLayers 抖动
        const rendered = new Map() // id -> marker
        const addVisibleMarkers = () => {
          if (!map.value || !clusterGroup) return
          const bounds = map.value.getBounds()?.pad(VIEWPORT_PADDING)
          if (!bounds) return
          const sw = bounds?._southWest
          const ne = bounds?._northEast
          if (!sw || !ne) return
          const south = sw.lat, west = sw.lng, north = ne.lat, east = ne.lng

          const current = new Set()
          const toAdd = []
          // 线性扫描（后续可替换为空间索引）
          for (const p of points) {
            if (!p || (p.point_type && p.point_type !== 'Point')) continue
            const coordObj = processCoordinates(p)
            if (!coordObj || coordObj.lat == null || coordObj.lng == null) continue
            const { lat, lng } = coordObj
            if (!isFinite(lat) || !isFinite(lng)) continue
            if (!(lat >= south && lat <= north && lng >= west && lng <= east)) continue
            current.add(p.id)
            if (!rendered.has(p.id)) {
              const pointSize = styleConfig.point_size
              const labelSize = Number(styleConfig.point_label_size)
              const pointColor = styleConfig.point_color
              const labelColor = styleConfig.point_label_color
              const pointOpacity = styleConfig.point_opacity
              const iconOptions = createPointIcon(pointSize, pointColor, pointOpacity, labelSize, labelColor, p.name || '')
              const marker = L.marker([lat, lng], { icon: L.divIcon(iconOptions), updateWhenZoom: false })
              toAdd.push([p.id, marker])
            }
          }
          const toRemove = []
          rendered.forEach((_, id) => { if (!current.has(id)) toRemove.push(id) })
          // 批量增删
          if (toRemove.length) {
            const removeMarkers = toRemove.map((id) => rendered.get(id)).filter(Boolean)
            try { if (removeMarkers.length) clusterGroup.removeLayers(removeMarkers) } catch {}
            toRemove.forEach((id) => rendered.delete(id))
          }
          if (toAdd.length) {
            const addMarkers = toAdd.map(([, m]) => m)
            try { clusterGroup.addLayers(addMarkers) } catch {}
            toAdd.forEach(([id, m]) => rendered.set(id, m))
          }
        }

        // 缩放门控：缩放期间不更新，缩放结束后更新一次
        let isZooming = false
        const onZoomStart = () => { isZooming = true }
        const onZoomEnd = () => { isZooming = false; addVisibleMarkers() }
        const onMoveEnd = () => { if (!isZooming) addVisibleMarkers() }

        layer.addTo(map.value)
        addVisibleMarkers()
        map.value.on('zoomstart', onZoomStart)
        map.value.on('zoomend', onZoomEnd)
        map.value.on('moveend', onMoveEnd)
        kmlViewportStates.set(
          kmlFile.id,
          { enabled: true, clusterGroup, sourcePoints: points, style: styleConfig, onMoveEnd, onZoomEnd, onZoomStart }
        )
        kmlLayers.value.push({ id: kmlFile.id, layer, title: kmlFile.title })
        try { console.info('[Map] KML 视口裁剪渲染启用:', { kmlId: kmlFile.id, title: kmlFile.title, totalPoints: points.length }) } catch {}
        return layer
      }

      // 常规路径：直接处理全部点（已优化为批量和分片）
      const { kmlLayer, featureCount } = processKmlPoints(points, kmlFile, styleConfig)
      if (!kmlLayer) return null
      if (featureCount > 0) {
        kmlLayer.addTo(map.value)
        kmlLayers.value.push({ id: kmlFile.id, layer: kmlLayer, title: kmlFile.title })
        return kmlLayer
      }
      console.warn('KML文件中没有找到有效的几何要素')
      return null
    } catch (e) {
      console.warn('处理KML点位视口渲染失败:', e)
      return null
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
      // 清理视口裁剪监听
      const vs = kmlViewportStates.get(id)
      if (vs) {
        try {
          if (vs.onMoveEnd) map.value.off('moveend', vs.onMoveEnd)
          if (vs.onZoomEnd) map.value.off('zoomend', vs.onZoomEnd)
        } catch {}
        kmlViewportStates.delete(id)
        try { console.info('[Map] KML 视口裁剪渲染已关闭:', { kmlId: id }) } catch {}
      }
    }
  };

  const clearKmlLayers = () => {
    kmlLayers.value.forEach(({ layer }) => {
      map.value.removeLayer(layer);
    });
    kmlLayers.value = [];
    // 清理所有KML视口裁剪监听
    kmlViewportStates.forEach((vs, id) => {
      try {
        if (vs.onMoveEnd) map.value.off('moveend', vs.onMoveEnd)
        if (vs.onZoomEnd) map.value.off('zoomend', vs.onZoomEnd)
      } catch {}
    })
    kmlViewportStates.clear()
  };

  return {
    addKmlLayer,
    addKmlLayers,
    removeKmlLayer,
    clearKmlLayers,
  };
}