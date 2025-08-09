import { useMapInstance } from './useMapInstance';
import { useMapState } from './useMapState';
import { useMapMarkers } from './useMapMarkers';
import { useKmlLayer } from './useKmlLayer';

export function useMap(containerId) {
  // 核心地图实例
  const { map, initMap, changeMapType, destroyMap, getBounds, getZoom, getCenter, setCenter } = useMapInstance(containerId);

  // 共享状态
  const { markers, kmlLayers, isLoading, onMarkerClick } = useMapState();

  // 点位标记管理
  const {
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
    removeMarker,
    clearMarkers: clearMarkersLogic,
    fitBounds,
  } = useMapMarkers(map, markers, onMarkerClick);

  // KML图层管理
  const {
    addKmlLayer,
    addKmlLayers,
    removeKmlLayer,
    clearKmlLayers: clearKmlLayersLogic,
  } = useKmlLayer(map, kmlLayers);

  // 组合清除逻辑
  const clearMarkers = () => {
    clearMarkersLogic();
    clearKmlLayersLogic(); // 原始逻辑是在清除标记时也清除KML
  };
  
  const clearKmlLayers = () => {
    clearKmlLayersLogic();
  };


  return {
    map,
    markers,
    kmlLayers,
    isLoading,
    onMarkerClick,
    
    // Map Instance
    initMap,
    changeMapType,
    destroyMap,
    getBounds,
    getZoom,
    getCenter,
    setCenter,

    // Markers
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
    removeMarker,
    clearMarkers,
    fitBounds,

    // KML
    addKmlLayer,
    addKmlLayers,
    removeKmlLayer,
    clearKmlLayers,
  };
}
