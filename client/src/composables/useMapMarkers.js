import L from 'leaflet';
import { createPointMarker } from '@/utils/map-utils.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';

export function useMapMarkers(map, markers, onMarkerClick) {
  const addPointMarker = (point) => {
    if (!map.value) return null;

    // 使用坐标转换工具获取显示坐标
    const coordinates = getDisplayCoordinates(point);
    
    if (!coordinates) {
      console.warn('点位坐标无效:', point);
      return null;
    }
    
    const [displayLng, displayLat] = coordinates;
    
    console.log('🗺️ 创建标记:', {
      pointId: point.id,
      pointTitle: point.title,
      displayCoords: [displayLat, displayLng],
      leafletFormat: `[${displayLat}, ${displayLng}]`
    });

    const pointType = point.type || 'panorama';
    
    // Leaflet需要[lat, lng]格式
    const marker = createPointMarker([displayLat, displayLng], pointType, {
      title: point.title || (pointType === 'video' ? '视频点位' : '全景图'),
    }, null); // 传递null作为styleConfig，让函数使用全局样式


    marker.on('click', () => {
      onMarkerClick.value(point);
    });

    marker.addTo(map.value);
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
    points.forEach(addPointMarker);
  };

  const removeMarker = (id) => {
    const markerIndex = markers.value.findIndex((m) => m.id === id);
    if (markerIndex > -1) {
      const { marker } = markers.value[markerIndex];
      map.value.removeLayer(marker);
      markers.value.splice(markerIndex, 1);
    }
  };

  const clearMarkers = () => {
    markers.value.forEach(({ marker }) => {
      map.value.removeLayer(marker);
    });
    markers.value = [];
    
    // 清除全局标记数组
    window.currentMarkers = [];
  };

  const fitBounds = () => {
    if (!map.value || markers.value.length === 0) return;
    
    try {
      const validMarkers = markers.value.filter(m => m.marker && m.marker._map);
      if (validMarkers.length === 0) return;
      
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
