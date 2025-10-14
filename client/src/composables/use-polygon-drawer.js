import { ref } from 'vue';
import L from 'leaflet';

/**
 * 多边形绘制工具
 * 用于在地图上绘制多边形区域
 */
export function usePolygonDrawer(mapRef, options = {}) {
  const { onComplete, message } = options;

  const isDrawing = ref(false);
  const points = ref([]);
  const polyline = ref(null);
  const markers = ref([]);

  const drawingStyle = {
    color: '#ff6d00',
    weight: 2,
    opacity: 0.8,
    dashArray: '5,5',
    fill: false,
  };

  const markerIcon = L.divIcon({
    className: 'contour-drawing-marker',
    html: '<div style="width: 8px; height: 8px; background: #ff6d00; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  const clear = () => {
    const map = mapRef?.value;
    if (!map) return;

    if (polyline.value) {
      map.removeLayer(polyline.value);
      polyline.value = null;
    }

    markers.value.forEach((marker) => map.removeLayer(marker));
    markers.value = [];
    points.value = [];
  };

  const updatePolyline = () => {
    const map = mapRef?.value;
    if (!map || points.value.length === 0) return;

    if (polyline.value) {
      map.removeLayer(polyline.value);
    }

    polyline.value = L.polyline(points.value, drawingStyle).addTo(map);
  };

  const completeDrawing = () => {
    const map = mapRef?.value;
    if (!map || points.value.length < 3) {
      if (message?.warning) {
        message.warning('至少需要3个点才能形成区域');
      }
      return;
    }

    // 确保闭合
    const polygonLatLngs = [...points.value];
    if (polygonLatLngs.length > 2) {
      const first = polygonLatLngs[0];
      const last = polygonLatLngs[polygonLatLngs.length - 1];
      if (first.lat !== last.lat || first.lng !== last.lng) {
        polygonLatLngs.push(first);
      }
    }

    // 计算边界
    const bounds = L.latLngBounds(polygonLatLngs);

    // 停止绘制并恢复状态
    stopDrawing();

    // 移除临时线和标记
    if (polyline.value) {
      map.removeLayer(polyline.value);
      polyline.value = null;
    }
    markers.value.forEach((marker) => map.removeLayer(marker));
    markers.value = [];

    // 回调完成事件
    if (onComplete) {
      onComplete({
        polygon: null,
        bounds,
        latLngs: polygonLatLngs,
      });
    }

    points.value = [];
  };

  const onMapClick = (e) => {
    if (!isDrawing.value) return;

    const map = mapRef?.value;
    if (!map) return;

    // 添加点
    points.value.push(e.latlng);

    // 添加标记
    const marker = L.marker(e.latlng, { icon: markerIcon }).addTo(map);
    markers.value.push(marker);

    // 更新线
    updatePolyline();

    // 如果点击的是第一个点附近，自动完成
    if (points.value.length > 2) {
      const firstPoint = points.value[0];
      const distance = map.distance(firstPoint, e.latlng);
      if (distance < 20) {
        // 20米内认为是点击第一个点
        points.value[points.value.length - 1] = firstPoint;
        completeDrawing();
      }
    }
  };

  const onMapDblClick = () => {
    if (!isDrawing.value) return;
    completeDrawing();
  };

  const startDrawing = () => {
    const map = mapRef?.value;
    if (!map) return;

    // 清除之前的绘制
    clear();

    isDrawing.value = true;
    points.value = [];

    // 修改鼠标样式
    map.getContainer().style.cursor = 'crosshair';

    // 绑定事件
    map.on('click', onMapClick);
    map.on('dblclick', onMapDblClick);

    // 禁用双击缩放
    map.doubleClickZoom.disable();

    if (message?.info) {
      message.info('请在地图上点击绘制区域，双击或点击起点完成绘制');
    }
  };

  const stopDrawing = () => {
    const map = mapRef?.value;
    if (!map) return;

    isDrawing.value = false;

    // 恢复鼠标样式
    map.getContainer().style.cursor = '';

    // 解绑事件
    map.off('click', onMapClick);
    map.off('dblclick', onMapDblClick);

    // 恢复双击缩放
    map.doubleClickZoom.enable();
  };

  const reset = () => {
    stopDrawing();
    clear();
  };

  return {
    isDrawing,
    startDrawing,
    stopDrawing,
    reset,
    clear,
  };
}
