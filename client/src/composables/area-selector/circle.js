// 圆形绘制相关逻辑
import { ElMessage } from 'element-plus';
import { gcj02ToWgs84, wgs84ToGcj02 } from '@/utils/coordinate-transform.js';

export function createCircleActions(context) {
  const { currentMode, circleRadius, isDrawingCircle, mapInstance, tempLayers, store } = context;

  const setMapCursor = (cursor) => {
    try {
      if (!mapInstance.value) return;
      const container = mapInstance.value.getContainer?.() || mapInstance.value._container;
      if (container) container.style.cursor = cursor || '';
    } catch (_) {}
  };

  const setMapInstance = (map) => {
    try {
      if (!map) {
        mapInstance.value = null;
        console.warn('[useAreaSelector] setMapInstance: received null/undefined');
        return;
      }
      if (map.clearMarkers && map.addPointMarkers) {
        const maybeMap = map.map || map.mapInstance || map._map || map.leafletMap;
        mapInstance.value = maybeMap && (maybeMap.on || maybeMap.getContainer) ? maybeMap : map;
        return;
      }
      if (map.value !== undefined) {
        const candidate = map.value?.map ?? map.value;
        mapInstance.value =
          candidate && (candidate.on || candidate.getContainer) ? candidate : candidate;
        return;
      }
      mapInstance.value = map;
    } catch (err) {
      console.error('[useAreaSelector] setMapInstance error:', err);
      mapInstance.value = map;
    }
  };

  const startCircleSelection = () => {
    if (!mapInstance.value && typeof window !== 'undefined' && window.mapInstance) {
      mapInstance.value = window.mapInstance;
    }
    if (!mapInstance.value) {
      ElMessage.error({ message: '地图未初始化', duration: 1000 });
      return;
    }
    currentMode.value = 'circle';
    isDrawingCircle.value = true;
    // 已移除点击地图选择圆心的提示
    // ElMessage.info(`点击地图选择圆心位置，当前半径: ${circleRadius.value}米`);
    try {
      if (mapInstance.value.on) {
        mapInstance.value.on('click', handleCircleClick);
      } else {
        console.warn(
          '[useAreaSelector] startCircleSelection: mapInstance has no .on method',
          mapInstance.value
        );
        ElMessage.error({
          message: '地图对象不具备事件绑定方法 (on)，绘制功能可能不可用',
          duration: 1000,
        });
      }
    } catch (err) {
      console.error('[useAreaSelector] startCircleSelection bind error:', err);
      ElMessage.error({ message: '绑定地图点击事件失败', duration: 1000 });
    }
    setMapCursor('crosshair');
  };

  const handleCircleClick = (e) => {
    if (!isDrawingCircle.value) return;
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
    const center = { latitude: wgsLat, longitude: wgsLng };
    store.addCircleArea(center, circleRadius.value);
    try {
      if (window.L && mapInstance.value) {
        try {
          const [gcjLng, gcjLat] = wgs84ToGcj02(center.longitude, center.latitude);
          const circleLayer = window.L.circle([gcjLat, gcjLng], {
            radius: circleRadius.value,
            color: 'blue',
            weight: 2,
            opacity: 0.6,
            fill: false,
          }).addTo(mapInstance.value);
          tempLayers.value.push(circleLayer);
        } catch (err) {
          const circleLayer = window.L.circle([center.latitude, center.longitude], {
            radius: circleRadius.value,
            color: 'blue',
            weight: 2,
            opacity: 0.6,
            fill: false,
          }).addTo(mapInstance.value);
          tempLayers.value.push(circleLayer);
        }
      }
    } catch (err) {
      console.warn('[useAreaSelector] failed to draw preview circle:', err);
    }
    completeCircleDrawing();
    // 已移除添加圆形区域成功提示
    // ElMessage.success(`已添加圆形区域，半径 ${circleRadius.value}米`);
  };

  const completeCircleDrawing = () => {
    isDrawingCircle.value = false;
    currentMode.value = null;
    if (mapInstance.value) {
      try {
        mapInstance.value.off('click', handleCircleClick);
      } catch (_) {}
      setMapCursor('');
    }
  };

  const clearTempLayers = () => {
    try {
      if (mapInstance.value && tempLayers.value && tempLayers.value.length > 0) {
        tempLayers.value.forEach((layer) => {
          try {
            mapInstance.value.removeLayer(layer);
          } catch (_) {}
        });
        tempLayers.value = [];
      }
    } catch (err) {
      console.warn('[useAreaSelector] clearTempLayers (circle) failed', err);
    }
  };

  const setCircleRadius = (radius) => {
    if (radius > 0) circleRadius.value = radius;
  };

  return {
    setMapInstance,
    startCircleSelection,
    handleCircleClick,
    completeCircleDrawing,
    setCircleRadius,
    clearTempLayers,
  };
}
