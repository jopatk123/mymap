import { ref, onUnmounted } from 'vue';
import L from 'leaflet';
import { createAMapTileLayer } from '@/utils/map-utils.js';

export function useMapInstance(containerId) {
  const map = ref(null);
  const tileLayer = ref(null);

  const initMap = (options = {}, initialMapType = 'normal') => {
    const defaultOptions = {
      center: [39.9042, 116.4074], // 北京天安门
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
      // 暂时不使用自定义CRS，使用标准配置
    };

    const mapOptions = { ...defaultOptions, ...options };
    map.value = L.map(containerId, mapOptions);

    // 自定义pane控制叠放顺序：KML < 视频 < 全景
    try {
      if (!map.value.getPane('kmlPane')) {
        map.value.createPane('kmlPane');
        map.value.getPane('kmlPane').style.zIndex = '580';
        map.value.getPane('kmlPane').style.pointerEvents = 'auto';
      }
      if (!map.value.getPane('videoPane')) {
        map.value.createPane('videoPane');
        map.value.getPane('videoPane').style.zIndex = '600';
        map.value.getPane('videoPane').style.pointerEvents = 'auto';
      }
      if (!map.value.getPane('panoramaPane')) {
        map.value.createPane('panoramaPane');
        map.value.getPane('panoramaPane').style.zIndex = '620';
        map.value.getPane('panoramaPane').style.pointerEvents = 'auto';
      }
    } catch {}

    tileLayer.value = createAMapTileLayer(initialMapType);
    tileLayer.value.addTo(map.value);

    // 设置全局地图实例
    window.mapInstance = map.value;

    return map.value;
  };

  const changeMapType = (type) => {
    if (!map.value) return;

    if (tileLayer.value) {
      map.value.removeLayer(tileLayer.value);
    }

    tileLayer.value = createAMapTileLayer(type);
    tileLayer.value.addTo(map.value);
  };

  const destroyMap = () => {
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
    
    // 清除全局地图实例
    window.mapInstance = null;
    window.currentMarkers = [];
  };

  onUnmounted(destroyMap);

  return {
    map,
    initMap,
    changeMapType,
    destroyMap,
    getBounds: () => map.value?.getBounds(),
    getZoom: () => map.value?.getZoom(),
    getCenter: () => map.value?.getCenter(),
    setCenter: (lat, lng, zoom) => map.value?.setView([lat, lng], zoom || map.value.getZoom()),
  };
}
