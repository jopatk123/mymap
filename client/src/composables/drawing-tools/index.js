import { computed } from 'vue';
import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { activeTool, drawings, state } from './state.js';
import { startMeasure } from './tools/measure.js';
import { startDrawPoint } from './tools/point.js';
import { startDrawLine } from './tools/line.js';
import { startDrawPolygon } from './tools/polygon.js';
import { startFreehand } from './tools/freehand.js';
import { startDrawCircle } from './tools/circle.js';
import { exportToKml } from './export/kml.js';

export function useDrawingTools() {
  const hasDrawings = computed(() => drawings.value.length > 0);

  const initializeTools = (map, options = {}) => {
    state.mapInstance = map;
    if (options && typeof options.setMarkerInteractivity === 'function') {
      state.setMarkerInteractivity = options.setMarkerInteractivity;
    }
    if (!state.drawingLayer) {
      state.drawingLayer = L.layerGroup().addTo(state.mapInstance);
    }
  };

  const setMarkerInteractivityHandler = (handler) => {
    state.setMarkerInteractivity = typeof handler === 'function' ? handler : null;
  };

  const deactivateTool = () => {
    const map = state.mapInstance;

    // 调用当前工具的清理函数（如果存在）
    if (state.currentCleanup && typeof state.currentCleanup === 'function') {
      try {
        state.currentCleanup();
      } catch (err) {
        console.warn('[drawing-tools] cleanup error:', err);
      }
      state.currentCleanup = null;
    }

    // 不再在这里统一移除事件监听器，由各个工具自己清理
    // 这样可以避免移除其他功能（如pointer-tracker）的监听器
    if (map) {
      if (map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
      }
    }
    if (state.measureTooltip && map) {
      map.removeLayer(state.measureTooltip);
      state.measureTooltip = null;
    }
    state.currentPath = null;
    state.isDrawing = false;
    // 恢复点位交互
    state.setMarkerInteractivity?.(false);
    activeTool.value = null;
  };

  const activateTool = (toolType) => {
    if (!state.mapInstance) return;
    deactivateTool();
    activeTool.value = toolType;
    switch (toolType) {
      case 'measure':
        startMeasure(deactivateTool);
        break;
      case 'point':
        startDrawPoint(deactivateTool);
        break;
      case 'line':
        startDrawLine(deactivateTool);
        break;
      case 'polygon':
        startDrawPolygon(deactivateTool);
        break;
      case 'draw':
        startFreehand(deactivateTool);
        break;
      case 'circle':
        startDrawCircle(deactivateTool);
        break;
    }
  };

  const clearAllDrawings = () => {
    return new Promise((resolve) => {
      if (state.drawingLayer) state.drawingLayer.clearLayers();
      if (state.measureTooltip && state.mapInstance) {
        state.mapInstance.removeLayer(state.measureTooltip);
        state.measureTooltip = null;
      }
      drawings.value.forEach((drawing) => {
        if (drawing.tooltips && state.mapInstance) {
          drawing.tooltips.forEach((tooltip) => {
            if (tooltip && state.mapInstance.hasLayer(tooltip)) {
              state.mapInstance.removeLayer(tooltip);
            }
          });
        }
      });
      drawings.value = [];
      deactivateTool();
      ElMessage.success('已清除所有绘制内容');
      resolve();
    });
  };

  return {
    activeTool,
    hasDrawings,
    drawings,
    initializeTools,
    setMarkerInteractivityHandler,
    activateTool,
    deactivateTool,
    clearAllDrawings,
    exportToKml,
  };
}
