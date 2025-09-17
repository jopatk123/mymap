import { ref, computed } from 'vue';
import L from 'leaflet';
import { dlog } from './utils/debug.js';
import { saveBlob } from './utils/shared.js';
import { generateKML } from './exporters/kml.js';
import { generateGeoJSON } from './exporters/geojson.js';
import { generateCSV } from './exporters/csv.js';
import { createMeasureTool } from './tools/measure.js';
import { createPointTool } from './tools/point.js';
import { createLineTool } from './tools/line.js';
import { createPolygonTool } from './tools/polygon.js';
import { createFreeDrawTool } from './tools/free-draw.js';
import { getStyleManager, getEventManager, resetPerformanceManagers } from './utils/performance.js';

// 工具状态管理
const activeTool = ref(null);
const drawings = ref([]);
let mapInstance = null;
let currentEventHandlers = {};
// 允许注册清理回调（例如自由绘结束恢复拖拽）
let cleanupCallbacks = [];

export function useDrawingTools() {
  // 计算属性
  const hasDrawings = computed(() => drawings.value.length > 0);

  // 初始化工具
  const initializeTools = (map) => {
    dlog('初始化绘图工具', map, 'type:', typeof map);
    if (!map) {
      console.warn('地图实例为空，无法初始化绘图工具');
      return;
    }

    mapInstance = map;

    // 确保地图有绘图图层组
    if (!map.drawingLayerGroup) {
      dlog('创建绘图图层组');
      map.drawingLayerGroup = L.layerGroup().addTo(map);
    } else {
      dlog('绘图图层组已存在');
    }

    // 初始化性能管理器
    getStyleManager();
    getEventManager(map);
    dlog('性能管理器初始化完成');

    dlog('绘图工具初始化完成');
  };

  const activateTool = (toolType, map) => {
    dlog('激活工具:', toolType);

    cleanupEventHandlers();

    activeTool.value = toolType;
    mapInstance = map;

    if (!map) {
      console.error('地图实例不存在');
      return;
    }

    // 对于非画笔工具，确保地图拖拽是启用的
    if (toolType !== 'draw') {
      dlog('启用地图拖拽(非画笔工具)');
      map.dragging.enable();
    }

    // 根据工具类型设置事件
    setupTool(toolType);

    // 设置光标样式
    map.getContainer().style.cursor = 'crosshair';
  };

  // 停用工具
  const deactivateTool = () => {
    dlog('停用工具, 当前激活:', activeTool.value);

    cleanupEventHandlers();

    // 重置光标
    if (mapInstance) {
      mapInstance.getContainer().style.cursor = '';
    }

    activeTool.value = null;
  };

  // 清理事件监听器
  const cleanupEventHandlers = () => {
    if (!mapInstance) return;

    // 清理所有注册的事件处理器
    Object.keys(currentEventHandlers).forEach((eventType) => {
      if (currentEventHandlers[eventType]) {
        try {
          mapInstance.off(eventType, currentEventHandlers[eventType]);
        } catch (e) {
          console.warn(`清理事件 ${eventType} 失败:`, e);
        }
      }
    });

    currentEventHandlers = {};
    
    // 执行注册的清理回调
    cleanupCallbacks.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('执行清理回调失败:', e);
      }
    });
    cleanupCallbacks = [];

    // 清理性能管理器的缓存和状态
    const styleManager = getStyleManager();
    if (styleManager) {
      styleManager.clearCache();
      styleManager.setMapInteracting(false);
    }

    const eventManager = getEventManager(mapInstance);
    if (eventManager) {
      eventManager.setMapInteracting(false);
      eventManager.clearInteractionTimeout();
    }

    // 强制垃圾回收（如果浏览器支持）
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
      } catch (e) {
        // 忽略垃圾回收错误
      }
    }
  };

  // 工具安装器
  const setupTool = (toolType) => {
    const register = (handlers) => {
      Object.assign(currentEventHandlers, handlers);
      Object.entries(handlers).forEach(([evt, fn]) => mapInstance.on(evt, fn));
      // 返回注销函数，供工具在需要时移除自身注册的事件
      const unregister = () => {
        try {
          Object.entries(handlers).forEach(([evt, fn]) => {
            if (fn) mapInstance.off(evt, fn);
            delete currentEventHandlers[evt];
          });
        } catch (e) {
          console.warn('unregister handlers failed', e);
        }
      };
      return unregister;
    };
    const onCleanup = (fn) => cleanupCallbacks.push(fn);

    switch (toolType) {
      case 'measure':
        createMeasureTool(mapInstance, drawings, register);
        break;
      case 'point':
        // 将 deactivateTool 作为 onComplete 回调传入，工具在完成一次添加后可调用以关闭自身
        createPointTool(mapInstance, drawings, register, () => deactivateTool());
        break;
      case 'line':
        createLineTool(mapInstance, drawings, register, onCleanup);
        break;
      case 'polygon':
        createPolygonTool(mapInstance, drawings, register, onCleanup);
        break;
      case 'draw':
        createFreeDrawTool(mapInstance, drawings, register, onCleanup);
        break;
      default:
        break;
    }
  };

  // 清除所有绘图
  const clearAllDrawings = () => {
    return new Promise((resolve) => {
      dlog('清除所有绘图');

      if (mapInstance && mapInstance.drawingLayerGroup) {
        mapInstance.drawingLayerGroup.clearLayers();
      }

      drawings.value = [];
      deactivateTool();
      resolve();
    });
  };

  // 导出绘图数据
  const exportDrawings = (format) => {
    return new Promise((resolve, reject) => {
      dlog('导出数据:', format);
      if (drawings.value.length === 0) {
        reject(new Error('没有可导出的数据'));
        return;
      }

      let data = '';
      let mimeType = 'text/plain';
      let fileExtension = format;

      try {
        switch (format.toLowerCase()) {
          case 'kml':
            data = generateKML(drawings.value);
            mimeType = 'application/vnd.google-earth.kml+xml';
            break;
          case 'geojson':
            data = generateGeoJSON(drawings.value);
            mimeType = 'application/json';
            break;
          case 'csv':
            data = generateCSV(drawings.value);
            mimeType = 'text/csv';
            break;
          default:
            reject(new Error(`不支持的导出格式: ${format}`));
            return;
        }
        saveBlob(
          data,
          mimeType,
          `绘图数据_${new Date().toISOString().split('T')[0]}.${fileExtension}`
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  return {
    // 状态
    activeTool,
    hasDrawings,
    drawings,

    // 方法
    initializeTools,
    activateTool,
    deactivateTool,
    clearAllDrawings,
    exportDrawings,
  };
}
