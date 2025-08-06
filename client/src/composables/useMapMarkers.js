import L from 'leaflet';
import { createPointMarker } from '@/utils/map-utils.js';

export function useMapMarkers(map, markers, onMarkerClick) {
  const addPointMarker = (point) => {
    if (!map.value) return null;

    let displayLat = point.lat || point.latitude;
    let displayLng = point.lng || point.longitude;

    if (point.gcj02Lat && point.gcj02Lng) {
      displayLat = point.gcj02Lat;
      displayLng = point.gcj02Lng;
    } else if (point.gcj02_lat && point.gcj02_lng) {
      displayLat = point.gcj02_lat;
      displayLng = point.gcj02_lng;
    }

    const pointType = point.type || 'panorama';
    const marker = createPointMarker([displayLat, displayLng], pointType, {
      title: point.title || (pointType === 'video' ? '视频点位' : '全景图'),
    }, null); // 传递null作为styleConfig，让函数使用全局样式

    marker.on('click', () => {
      onMarkerClick.value(point);
    });

    marker.addTo(map.value);
    markers.value.push({ id: point.id, marker, type: pointType });

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
  };

  const fitBounds = () => {
    if (!map.value || markers.value.length === 0) return;
    const group = new L.featureGroup(markers.value.map((m) => m.marker));
    map.value.fitBounds(group.getBounds(), { padding: [20, 20] });
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
