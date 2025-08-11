import L from 'leaflet';
import 'leaflet.markercluster';
import { createPointMarker, createClusterIcon } from '@/utils/map-utils.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';

export function useMapMarkers(map, markers, onMarkerClick) {
  // 按类型维护两个 cluster group
  let panoramaClusterGroup = null;
  let videoClusterGroup = null;
  let onZoomStart = null;
  let onZoomEnd = null;

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
    const coordinates = getDisplayCoordinates(point);
    
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
