// useAreaSelector 入口 - 聚合拆分后的模块，保持原有 API
// computed import removed (not used in this module)
import { createAreaSelectorContext } from './context.js';
import { createMapSync } from './map-sync.js';
import { createCircleActions } from './circle.js';
import { createPolygonActions } from './polygon.js';
import { createManageActions } from './manage.js';

export function useAreaSelector() {
  const context = createAreaSelectorContext();
  // 子模块
  const mapSync = createMapSync(context);
  // intentionally not referenced further; mark to satisfy linter
  void mapSync;
  const circle = createCircleActions(context);
  const polygon = createPolygonActions(context);
  const manage = createManageActions(context, circle, polygon);

  // 暴露与旧版一致的 API
  return {
    // 状态
    currentMode: context.currentMode,
    circleRadius: context.circleRadius,
    isDrawingCircle: context.isDrawingCircle,
    isDrawingPolygon: context.isDrawingPolygon,
    polygonPoints: context.polygonPoints,
    tempPolygonName: context.tempPolygonName,
    // 计算
    isActive: context.isActive,
    isDrawing: context.isDrawing,
    areas: context.areas,
    areasCount: context.areasCount,
    // 方法 (顺序大体保持原文件)
    setMapInstance: circle.setMapInstance,
    startCircleSelection: circle.startCircleSelection,
    startPolygonSelection: polygon.startPolygonSelection,
    finishDrawing: manage.finishDrawing,
    cancelDrawing: manage.cancelDrawing,
    clearAllAreas: manage.clearAllAreas,
    removeArea: manage.removeArea,
    setCircleRadius: circle.setCircleRadius,
  };
}
