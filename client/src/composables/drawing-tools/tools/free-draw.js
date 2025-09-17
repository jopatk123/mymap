import L from 'leaflet';
import { dlog } from '../utils/debug.js';
import { getEventManager, throttle, debounce } from '../utils/performance.js';

export function createFreeDrawTool(mapInstance, drawings, register, onCleanup) {
  dlog('设置画笔工具');
  dlog('禁用地图拖拽');
  mapInstance.dragging.disable();

  let isDrawing = false;
  let points = [];
  let polyline = null;
  let lastUpdateTime = 0;
  const updateInterval = 16; // 约60fps，避免过度频繁更新
  
  // 初始化事件管理器
  const eventManager = getEventManager(mapInstance);

  const handleMouseDown = (e) => {
    dlog('开始自由绘制');
    isDrawing = true;
    points = [e.latlng];
    lastUpdateTime = Date.now();
    
    // 创建优化的polyline配置
    polyline = L.polyline([e.latlng], {
      color: '#ff6600',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 2, // 增加平滑因子减少渲染复杂度
      interactive: false, // 绘制过程中禁用交互以提升性能
    }).addTo(mapInstance.drawingLayerGroup);
    
    e.originalEvent?.preventDefault();
    e.originalEvent?.stopPropagation();
  };

  // 使用节流优化mousemove性能
  const handleMouseMove = throttle((e) => {
    if (isDrawing && polyline) {
      const now = Date.now();
      
      // 限制更新频率以减少DOM操作
      if (now - lastUpdateTime < updateInterval) {
        return;
      }
      
      points.push(e.latlng);
      
      // 批量更新坐标而不是单个添加
      if (points.length % 3 === 0) { // 每3个点更新一次
        polyline.setLatLngs([...points]);
      } else {
        polyline.addLatLng(e.latlng);
      }
      
      lastUpdateTime = now;
      e.originalEvent?.preventDefault();
      e.originalEvent?.stopPropagation();
    }
  }, 16); // 16ms节流，约60fps

  const handleMouseUp = (e) => {
    if (isDrawing) {
      dlog('自由绘制完成');
      isDrawing = false;
      
      // 确保最终坐标是完整的
      if (polyline && points.length > 0) {
        polyline.setLatLngs([...points]);
        // 绘制完成后恢复交互性
        polyline.options.interactive = true;
      }
      
      drawings.value.push({ 
        type: 'draw', 
        data: { points: [...points], polyline }, 
        id: Date.now() 
      });
      
      // 清理临时变量
      points = [];
      polyline = null;
      
      e.originalEvent?.preventDefault();
      e.originalEvent?.stopPropagation();
    }
  };

  register({ mousedown: handleMouseDown, mousemove: handleMouseMove, mouseup: handleMouseUp });

  onCleanup?.(() => {
    // 清理资源
    if (polyline && mapInstance.drawingLayerGroup) {
      try {
        mapInstance.drawingLayerGroup.removeLayer(polyline);
      } catch (e) {
        // 忽略清理错误
      }
    }
    
    // 重置状态
    isDrawing = false;
    points = [];
    polyline = null;
    
    // 收尾：重新启用拖拽
    mapInstance.dragging.enable();
  });
}
