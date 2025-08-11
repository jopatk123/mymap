import L from 'leaflet';
import 'leaflet.markercluster';
import { createPointMarker, createClusterIcon } from '@/utils/map-utils.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';

export function useMapMarkers(map, markers, onMarkerClick) {
  const VIEWPORT_THRESHOLD = 1200
  // 按类型维护两个 cluster group
  let panoramaClusterGroup = null;
  let videoClusterGroup = null;
  let onZoomStart = null;
  let onZoomEnd = null;

  // 视口裁剪状态
  const viewportState = {
    enabled: false,
    bufferPad: 0.2, // 视口外扩比例
    minZoom: 0,
    sourcePoints: [],
    renderedIds: new Set(),
    throttleTimer: null,
    updateIntervalMs: 120,
    coordCache: new Map(), // id -> [lng, lat]
    onMoveEnd: null,
    onZoomEnd: null,
  }

  const ensureClusterGroup = (type) => {
    const styles = type === 'video' ? (window.videoPointStyles || {}) : (window.panoramaPointStyles || {})
    const color = styles.cluster_color || styles.point_color || '#3388ff'
    const iconCreateFunction = (cluster) => {
      const count = cluster.getChildCount()
      return createClusterIcon(color, count)
    }
    if (type === 'video') {
      if (!videoClusterGroup) {
        videoClusterGroup = L.markerClusterGroup({
          iconCreateFunction,
          chunkedLoading: true,
          chunkInterval: 50,
          chunkDelay: 20,
          removeOutsideVisibleBounds: true,
          disableClusteringAtZoom: 19,
          spiderfyOnEveryClick: false,
          animate: false,
        })
        map.value.addLayer(videoClusterGroup)
      }
      return videoClusterGroup
    } else {
      if (!panoramaClusterGroup) {
        panoramaClusterGroup = L.markerClusterGroup({
          iconCreateFunction,
          chunkedLoading: true,
          chunkInterval: 50,
          chunkDelay: 20,
          removeOutsideVisibleBounds: true,
          disableClusteringAtZoom: 19,
          spiderfyOnEveryClick: false,
          animate: false,
        })
        map.value.addLayer(panoramaClusterGroup)
      }
      return panoramaClusterGroup
    }
  }

  // 降噪：缩放期间调整 marker 行为，避免动画访问已移除图层
  const ensureZoomGuards = () => {
    if (!map.value) return
    if (onZoomStart || onZoomEnd) return
    onZoomStart = () => {
      if (panoramaClusterGroup) panoramaClusterGroup.options.animate = false
      if (videoClusterGroup) videoClusterGroup.options.animate = false
    }
    onZoomEnd = () => {
      if (panoramaClusterGroup) panoramaClusterGroup.options.animate = true
      if (videoClusterGroup) videoClusterGroup.options.animate = true
    }
    map.value.on('zoomstart', onZoomStart)
    map.value.on('zoomend', onZoomEnd)
  }

  const addPointMarker = (point) => {
    if (!map.value) return null;

    // 使用坐标转换工具获取显示坐标
    // 坐标缓存
    let coordinates = viewportState.coordCache.get(point.id)
    if (!coordinates) {
      coordinates = getDisplayCoordinates(point)
      if (coordinates) viewportState.coordCache.set(point.id, coordinates)
    }
    
    if (!coordinates) {
      console.warn('点位坐标无效:', point);
      return null;
    }
    
    const [displayLng, displayLat] = coordinates;
    


    const pointType = point.type || 'panorama';
    
    // Leaflet需要[lat, lng]格式
    const marker = createPointMarker([displayLat, displayLng], pointType, {
      title: point.title || (pointType === 'video' ? '视频点位' : '全景图'),
      updateWhenZoom: false,
    }, null); // 传递null作为styleConfig，让函数使用全局样式


    marker.on('click', () => {
      onMarkerClick.value(point);
    });

    const styles = pointType === 'video' ? (window.videoPointStyles || {}) : (window.panoramaPointStyles || {})
    const useCluster = Boolean(styles.cluster_enabled)
    if (useCluster) {
      const group = ensureClusterGroup(pointType)
      group.addLayer(marker)
      ensureZoomGuards()
    } else {
      marker.addTo(map.value);
    }
    const markerInfo = { id: point.id, marker, type: pointType, data: point };
    markers.value.push(markerInfo);
    
    // 同步到全局标记数组
    if (!window.currentMarkers) {
      window.currentMarkers = [];
    }
    window.currentMarkers.push(markerInfo);

    return marker;
  };

  const addPanoramaMarker = (panorama) => {
    return addPointMarker({ ...panorama, type: 'panorama' });
  };

  const addPanoramaMarkers = (panoramas) => {
    panoramas.forEach(addPanoramaMarker);
  };

  const addPointMarkers = (points) => {
    if (!Array.isArray(points) || points.length === 0) return
    // 自动启用视口裁剪
    if (!viewportState.enabled && points.length >= VIEWPORT_THRESHOLD) {
      try {
        // 控制台提示：启用视口裁剪渲染
        console.info('[Map] 启用视口裁剪渲染:', {
          totalPoints: points.length,
          threshold: VIEWPORT_THRESHOLD,
          bufferPad: viewportState.bufferPad,
        })
      } catch {}
      enableViewportClipping(points)
      return
    }
    // 若启用视口裁剪，则只渲染视口内的
    if (viewportState.enabled) {
      viewportState.sourcePoints = points
      scheduleViewportUpdate()
      return
    }
    const videoStyles = window.videoPointStyles || {}
    const panoStyles = window.panoramaPointStyles || {}
    const videoClusterOn = Boolean(videoStyles.cluster_enabled)
    const panoClusterOn = Boolean(panoStyles.cluster_enabled)

    // 如果两类都不开聚合，走原逻辑
    if (!videoClusterOn && !panoClusterOn) {
      points.forEach(addPointMarker)
      return
    }

    const batchVideo = []
    const batchPano = []

    for (const p of points) {
      const pointType = p.type || 'panorama'
      const coordinates = getDisplayCoordinates(p)
      if (!coordinates) continue
      const [displayLng, displayLat] = coordinates
      const marker = createPointMarker([displayLat, displayLng], pointType, {
        title: p.title || (pointType === 'video' ? '视频点位' : '全景图'),
        updateWhenZoom: false,
      }, null)
      marker.on('click', () => onMarkerClick.value(p))

      const markerInfo = { id: p.id, marker, type: pointType, data: p }
      markers.value.push(markerInfo)
      if (!window.currentMarkers) window.currentMarkers = []
      window.currentMarkers.push(markerInfo)

      if (pointType === 'video' && videoClusterOn) {
        batchVideo.push(marker)
      } else if (pointType === 'panorama' && panoClusterOn) {
        batchPano.push(marker)
      } else {
        marker.addTo(map.value)
      }
    }

    if (batchVideo.length) {
      const group = ensureClusterGroup('video')
      group.addLayers(batchVideo)
      ensureZoomGuards()
    }
    if (batchPano.length) {
      const group = ensureClusterGroup('panorama')
      group.addLayers(batchPano)
      ensureZoomGuards()
    }
  };

  // 计算扩展边界
  const getPaddedBounds = () => {
    const b = map.value.getBounds()
    try {
      return b.pad(viewportState.bufferPad)
    } catch { return b }
  }

  // 视口裁剪：调度节流更新
  const scheduleViewportUpdate = () => {
    if (viewportState.throttleTimer) return
    viewportState.throttleTimer = setTimeout(() => {
      viewportState.throttleTimer = null
      updateViewportRendering()
    }, viewportState.updateIntervalMs)
  }

  // 视口裁剪：执行差异更新
  const updateViewportRendering = () => {
    if (!map.value || !viewportState.enabled || !viewportState.sourcePoints?.length) return
    const bounds = getPaddedBounds()
    const toAdd = []
    const currentInBounds = new Set()

    for (const p of viewportState.sourcePoints) {
      // 仅窗口内的加入
      let coords = viewportState.coordCache.get(p.id)
      if (!coords) {
        coords = getDisplayCoordinates(p)
        if (coords) viewportState.coordCache.set(p.id, coords)
      }
      if (!coords) continue
      const [lng, lat] = coords
      const ll = L.latLng(lat, lng)
      if (bounds.contains(ll)) {
        currentInBounds.add(p.id)
        if (!viewportState.renderedIds.has(p.id)) {
          toAdd.push(p)
        }
      }
    }

    // 需要移除的：已渲染但不在当前窗口
    const toRemove = []
    viewportState.renderedIds.forEach((id) => {
      if (!currentInBounds.has(id)) toRemove.push(id)
    })

    // 批量处理
    if (toRemove.length) {
      toRemove.forEach(removeMarker)
      toRemove.forEach((id) => viewportState.renderedIds.delete(id))
    }
    if (toAdd.length) {
      // 利用现有批量逻辑（会自动按聚合开关选择批量/单个）
      // 但 addPointMarkers 会因 enabled 为 true 而 schedule，再次递归，因此改为逐个 addPointMarker
      for (const p of toAdd) {
        addPointMarker(p)
        viewportState.renderedIds.add(p.id)
      }
    }
  }

  // 开启视口裁剪
  const enableViewportClipping = (points, options = {}) => {
    if (!map.value) return
    viewportState.enabled = true
    viewportState.bufferPad = options.bufferPad ?? viewportState.bufferPad
    viewportState.minZoom = options.minZoom ?? viewportState.minZoom
    viewportState.sourcePoints = points || []
    viewportState.renderedIds.clear()
    viewportState.coordCache.clear()
    try {
      console.info('[Map] 视口裁剪渲染已启用', {
        count: viewportState.sourcePoints.length,
        bufferPad: viewportState.bufferPad,
        updateIntervalMs: viewportState.updateIntervalMs,
      })
    } catch {}

    // 事件监听
    viewportState.onMoveEnd = () => scheduleViewportUpdate()
    viewportState.onZoomEnd = () => scheduleViewportUpdate()
    map.value.on('moveend', viewportState.onMoveEnd)
    map.value.on('zoomend', viewportState.onZoomEnd)

    // 初次渲染
    scheduleViewportUpdate()
  }

  // 关闭视口裁剪
  const disableViewportClipping = () => {
    viewportState.enabled = false
    viewportState.sourcePoints = []
    if (viewportState.onMoveEnd) map.value?.off('moveend', viewportState.onMoveEnd)
    if (viewportState.onZoomEnd) map.value?.off('zoomend', viewportState.onZoomEnd)
    viewportState.onMoveEnd = null
    viewportState.onZoomEnd = null
    viewportState.renderedIds.clear()
    viewportState.coordCache.clear()
    try { console.info('[Map] 视口裁剪渲染已关闭') } catch {}
  }

  const removeMarker = (id) => {
    const markerIndex = markers.value.findIndex((m) => m.id === id);
    if (markerIndex > -1) {
      const { marker, type } = markers.value[markerIndex];
      
      try {
        // 先尝试从聚合组中移除
        const styles = type === 'video' ? (window.videoPointStyles || {}) : (window.panoramaPointStyles || {});
        const useCluster = Boolean(styles.cluster_enabled);
        
        if (useCluster) {
          const group = type === 'video' ? videoClusterGroup : panoramaClusterGroup;
          if (group && group.hasLayer(marker)) {
            group.removeLayer(marker);
          }
        } else if (marker && map.value && marker._map) {
          map.value.removeLayer(marker);
        }
      } catch (error) {
        console.debug('移除单个标记时出错:', error);
      }
      
      markers.value.splice(markerIndex, 1);
      
      // 同步更新全局标记数组
      if (window.currentMarkers) {
        window.currentMarkers = window.currentMarkers.filter(m => m.id !== id);
      }
    }
  };

  const clearMarkers = () => {
    try {
      // 关闭视口裁剪
      if (viewportState.enabled) {
        disableViewportClipping()
      }
      // 先清理聚合组，避免在动画过程中移除单个标记
      if (panoramaClusterGroup) {
        panoramaClusterGroup.clearLayers();
        if (map.value && map.value.hasLayer(panoramaClusterGroup)) {
          map.value.removeLayer(panoramaClusterGroup);
        }
        panoramaClusterGroup = null;
      }
      
      if (videoClusterGroup) {
        videoClusterGroup.clearLayers();
        if (map.value && map.value.hasLayer(videoClusterGroup)) {
          map.value.removeLayer(videoClusterGroup);
        }
        videoClusterGroup = null;
      }
      if (map.value && onZoomStart && onZoomEnd) {
        map.value.off('zoomstart', onZoomStart)
        map.value.off('zoomend', onZoomEnd)
        onZoomStart = null
        onZoomEnd = null
      }

      // 然后清理剩余的单独标记
      markers.value.forEach(({ marker }) => {
        try {
          if (marker && map.value && marker._map) {
            map.value.removeLayer(marker);
          }
        } catch (error) {
          // 静默处理单个标记移除失败
          console.debug('移除标记时出错:', error);
        }
      });

      markers.value = [];
      
      // 清除全局标记数组
      window.currentMarkers = [];
    } catch (error) {
      console.warn('清除标记时出错:', error);
      // 强制清空数组，即使出错也要保证状态一致
      markers.value = [];
      window.currentMarkers = [];
    }
  };

  const fitBounds = () => {
    if (!map.value) return;
    
    try {
      const validMarkers = markers.value.filter(m => m.marker && m.marker._map && typeof m.marker.getLatLng === 'function');
      // 如果没有独立标记，尝试用聚合组的边界
      if (validMarkers.length === 0) {
        let bounds = null
        if (videoClusterGroup && map.value.hasLayer(videoClusterGroup) && typeof videoClusterGroup.getBounds === 'function') {
          const b = videoClusterGroup.getBounds()
          if (b && b.isValid && b.isValid()) bounds = bounds ? bounds.extend(b) : b
        }
        if (panoramaClusterGroup && map.value.hasLayer(panoramaClusterGroup) && typeof panoramaClusterGroup.getBounds === 'function') {
          const b = panoramaClusterGroup.getBounds()
          if (b && b.isValid && b.isValid()) bounds = bounds ? bounds.extend(b) : b
        }
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.value.fitBounds(bounds, { padding: [20, 20] });
        }
        return;
      }
      
      const group = new L.featureGroup(validMarkers.map((m) => m.marker));
      const bounds = group.getBounds();
      
      if (bounds.isValid()) {
        map.value.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (error) {
      console.warn('fitBounds failed:', error);
    }
  };

  return {
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
    removeMarker,
    clearMarkers,
    fitBounds,
  };
}
