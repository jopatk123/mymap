import L from 'leaflet';
import 'leaflet.markercluster';
import { createClusterIcon } from '@/utils/map-utils.js';

// 管理视频 / 全景 两类聚合层与缩放动画守卫
export function createClusterManager(map) {
  let panoramaClusterGroup = null;
  let videoClusterGroup = null;
  let onZoomStart = null;
  let onZoomEnd = null;

  const getPaneNameByType = (type) => {
    switch (type) {
      case 'video':
        return 'videoPane';
      case 'image-set':
        return 'imageSetPane';
      case 'panorama':
      default:
        return 'panoramaPane';
    }
  };

  const ensureClusterGroup = (type) => {
    const getStyles = (t) => {
      switch (t) {
        case 'video':
          return window.videoPointStyles || {};
        case 'image-set':
          return window.imageSetPointStyles || {};
        case 'panorama':
        default:
          return window.panoramaPointStyles || {};
      }
    };
    const styles = getStyles(type);
    const color = styles.cluster_color || styles.point_color || '#3388ff';
    const iconCreateFunction = (cluster) => createClusterIcon(color, cluster.getChildCount());

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
          pane: getPaneNameByType('video'),
        });
        map.value.addLayer(videoClusterGroup);
      }
      return videoClusterGroup;
    }
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
        pane: getPaneNameByType('panorama'),
      });
      map.value.addLayer(panoramaClusterGroup);
    }
    return panoramaClusterGroup;
  };

  const ensureZoomGuards = () => {
    if (!map.value) return;
    if (onZoomStart || onZoomEnd) return;
    onZoomStart = () => {
      if (panoramaClusterGroup) panoramaClusterGroup.options.animate = false;
      if (videoClusterGroup) videoClusterGroup.options.animate = false;
    };
    onZoomEnd = () => {
      if (panoramaClusterGroup) panoramaClusterGroup.options.animate = true;
      if (videoClusterGroup) videoClusterGroup.options.animate = true;
    };
    map.value.on('zoomstart', onZoomStart);
    map.value.on('zoomend', onZoomEnd);
  };

  const clearAll = () => {
    if (panoramaClusterGroup) {
      panoramaClusterGroup.clearLayers();
      if (map.value?.hasLayer(panoramaClusterGroup)) map.value.removeLayer(panoramaClusterGroup);
      panoramaClusterGroup = null;
    }
    if (videoClusterGroup) {
      videoClusterGroup.clearLayers();
      if (map.value?.hasLayer(videoClusterGroup)) map.value.removeLayer(videoClusterGroup);
      videoClusterGroup = null;
    }
    if (map.value && onZoomStart && onZoomEnd) {
      map.value.off('zoomstart', onZoomStart);
      map.value.off('zoomend', onZoomEnd);
      onZoomStart = null;
      onZoomEnd = null;
    }
  };

  const removeBatches = ({ video = [], pano = [] }) => {
    if (video.length && videoClusterGroup) videoClusterGroup.removeLayers(video);
    if (pano.length && panoramaClusterGroup) panoramaClusterGroup.removeLayers(pano);
  };

  return {
    ensureClusterGroup,
    ensureZoomGuards,
    clearAll,
    removeBatches,
    get videoClusterGroup() {
      return videoClusterGroup;
    },
    get panoramaClusterGroup() {
      return panoramaClusterGroup;
    },
  };
}
