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

  const initializeTools = (map) => {
    state.mapInstance = map;
    if (!state.drawingLayer) {
      state.drawingLayer = L.layerGroup().addTo(state.mapInstance);
    }
  };

  const deactivateTool = () => {
    const map = state.mapInstance;
    if (map) {
      map.off('click');
      map.off('mousemove');
      map.off('mousedown');
      map.off('mouseup');
      map.off('dblclick');
      if (map.dragging && !map.dragging.enabled()) {
        map.dragging.enable();
      }
    }
    if (state.measureTooltip) {
      map.removeLayer(state.measureTooltip);
      state.measureTooltip = null;
    }
    state.currentPath = null;
    state.isDrawing = false;
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
    activateTool,
    deactivateTool,
    clearAllDrawings,
    exportToKml,
  };
}
