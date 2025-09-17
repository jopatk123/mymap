import L from 'leaflet';
import { dlog } from '../utils/debug.js';
import { getStyleManager, getEventManager, debounce, throttle } from '../utils/performance.js';

export function createPointTool(mapInstance, drawings, register, onComplete) {
  dlog('设置添加点工具');

  // register 返回一个 unregister 方法（在 setupTool 中实现）
  let unregister = null;

  // 防抖处理，避免快速重复点击
  const handleClick = debounce((e) => {
    // 防止在点击已有标记时重复添加
    if (
      e.originalEvent &&
      e.originalEvent.target &&
      e.originalEvent.target.closest('.drawing-point-marker')
    ) {
      return;
    }

    dlog('添加点:', e.latlng);

    const pointIndex = drawings.value.filter((d) => d.type === 'point').length + 1;
    const pointId = `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建点位数据
    const pointData = {
      type: 'point',
      id: pointId,
      name: `点位${pointIndex}`,
      description: '',
      latlng: e.latlng,
      icon: '📍',
      color: '#409eff',
      size: 24,
      timestamp: new Date(),
      properties: {},
    };

    // 创建标记
    const marker = L.marker(e.latlng, {
      icon: createPointIcon(pointData),
      pointId: pointId, // 存储点位ID用于后续查找
      riseOnHover: true,
    }).addTo(mapInstance.drawingLayerGroup);

    // 存储marker引用到点位数据中
    pointData.marker = marker;

    // 设置标记事件
    setupMarkerEvents(marker, pointData, drawings, mapInstance);

    // 添加到绘图数组（统一 data 结构）
    drawings.value.push({
      type: 'point',
      id: pointData.id,
      name: pointData.name,
      timestamp: pointData.timestamp,
      // 兼容旧结构（顶层字段）
      latlng: pointData.latlng,
      marker: pointData.marker,
      // 标准化 data 字段
      data: { latlng: pointData.latlng, icon: pointData.icon, color: pointData.color, size: pointData.size },
      properties: pointData.properties,
      _internal: { marker: pointData.marker },
    });

    dlog('点位已添加:', pointData);

    // 添加完一个点后，取消注册事件并触发 onComplete（由 index.js 停用工具）
    try {
      if (typeof unregister === 'function') unregister();
    } catch (e) {
      dlog('注销添加点事件失败', e);
    }

    try {
      if (typeof onComplete === 'function') onComplete();
    } catch (e) {
      dlog('onComplete 回调执行失败', e);
    }
  }, 200);

  // 在声明 handleClick 后再注册事件以获得正确的函数引用
  try {
    unregister = register({ click: handleClick });
  } catch (e) {
    dlog('register point handler failed', e);
  }
}

// 创建点位图标
function createPointIcon(pointData) {
  const size = pointData.size || 24;
  return L.divIcon({
    className: 'drawing-point-marker interactive-point',
    html: `<div style="
      font-size: ${size}px; 
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s ease;
    " data-point-id="${pointData.id}">${pointData.icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// 设置标记事件
function setupMarkerEvents(marker, pointData, drawings, mapInstance) {
  // 左键点击事件 - 显示信息弹窗
  marker.on('click', (e) => {
    dlog('点击点位:', pointData.name);
    L.DomEvent.stopPropagation(e);

    // 触发自定义事件，由DrawingToolbar组件监听
    mapInstance.fire('point:click', {
      point: pointData,
      latlng: e.latlng,
      containerPoint: e.containerPoint,
    });
  });

  // 右键点击事件 - 显示上下文菜单
  marker.on('contextmenu', (e) => {
    dlog('右键点击点位:', pointData.name);
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);

    // 获取屏幕坐标
    const containerPoint = e.containerPoint;
    const mapContainer = mapInstance.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();

    // 触发自定义事件
    mapInstance.fire('point:contextmenu', {
      point: pointData,
      position: {
        x: mapRect.left + containerPoint.x,
        y: mapRect.top + containerPoint.y,
      },
    });
  });

  // 优化的鼠标悬停效果 - 使用节流和事件管理器
  const eventManager = getEventManager(mapInstance);

  const handleMouseOver = throttle(eventManager.createOptimizedHandler(() => {
    const icon = marker.getElement();
    if (icon) {
      const iconDiv = icon.querySelector('div');
      if (iconDiv) {
        iconDiv.style.transform = 'scale(1.2)';
        iconDiv.style.transition = 'transform 0.2s ease';
      }
    }
  }, 'mouseover'), 50);

  const handleMouseOut = throttle(eventManager.createOptimizedHandler(() => {
    const icon = marker.getElement();
    if (icon) {
      const iconDiv = icon.querySelector('div');
      if (iconDiv) {
        iconDiv.style.transform = 'scale(1)';
      }
    }
  }, 'mouseout'), 50);

  marker.on('mouseover', handleMouseOver);
  marker.on('mouseout', handleMouseOut);
}

// 导出辅助函数供其他模块使用
export { createPointIcon, setupMarkerEvents };
