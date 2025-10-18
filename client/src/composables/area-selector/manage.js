// 公共管理/控制操作
import { ElMessage, ElMessageBox } from 'element-plus';

/**
 * 管理模块：提供取消绘制、完成绘制、清除所有区域与删除单个区域的交互逻辑。
 * 这些函数会调用 store 的方法并显示用户提示。
 */

export function createManageActions(context, circle, polygon) {
  const { store, isDrawingCircle, isDrawingPolygon } = context;
  const { completeCircleDrawing } = circle;
  const { finishPolygonDrawing, clearTempLayers } = polygon;
  // circle may now expose clearTempLayers
  const { clearTempLayers: clearCircleTempLayers } = circle;

  const cancelDrawing = () => {
    if (isDrawingCircle.value) {
      completeCircleDrawing();
    } else if (isDrawingPolygon.value) {
      finishPolygonDrawing();
    }
    try {
      clearTempLayers();
    } catch (err) {
      console.warn('[useAreaSelector] cancelDrawing: clearTempLayers failed', err);
    }
    try {
      if (typeof clearCircleTempLayers === 'function') clearCircleTempLayers();
    } catch (err) {
      console.warn('[useAreaSelector] cancelDrawing: clearCircleTempLayers failed', err);
    }
    ElMessage.info({ message: '已取消绘制', duration: 1000 });
  };

  const finishDrawing = async () => {
    if (isDrawingPolygon.value) {
      // polygon 完成逻辑在 double click 内部处理，这里直接调用完成函数以统一流程
      await polygon.completePolygonDrawing();
      return;
    }
    if (isDrawingCircle.value) {
      completeCircleDrawing();
    }
  };

  const clearAllAreas = async () => {
    if (store.areas.length === 0) {
      // 没有区域但仍然尝试清除搜索临时标记
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('clear-search-marker'));
        }
      } catch (err) {
        console.warn(
          '[useAreaSelector] clearAllAreas: failed to dispatch clear-search-marker',
          err
        );
      }
      ElMessage.info({ message: '没有可清除的区域（已尝试清除搜索标记）', duration: 1000 });
      return;
    }
    // 直接清除所有区域（已移除二次确认），并同时清除任何绘制的临时图层与搜索临时标记
    try {
      store.clearAllAreas();
      try {
        clearTempLayers();
      } catch (err) {
        console.warn('[useAreaSelector] clearAllAreas: failed to clear temp layers', err);
      }
      try {
        if (typeof clearCircleTempLayers === 'function') clearCircleTempLayers();
      } catch (err) {
        console.warn('[useAreaSelector] clearAllAreas: failed to clear circle temp layers', err);
      }
      // 触发全局事件以请求清除搜索临时标记（地图容器会监听并执行实际清除）
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('clear-search-marker'));
        }
      } catch (err) {
        console.warn(
          '[useAreaSelector] clearAllAreas: failed to dispatch clear-search-marker',
          err
        );
      }
      // 已移除清除所有区域成功提示
      // ElMessage.success('已清除所有区域');
    } catch (err) {
      /* 捕获并记录意外错误（非用户取消） */
      console.error('[useAreaSelector] clearAllAreas failed', err);
    }
  };

  const removeArea = async (areaId, areaName) => {
    try {
      await ElMessageBox.confirm(`确定要删除区域"${areaName}"吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
      store.removeArea(areaId);
      ElMessage.success({ message: '区域删除成功', duration: 1000 });
    } catch (_) {
      /* 用户取消 */
    }
  };

  return { cancelDrawing, finishDrawing, clearAllAreas, removeArea };
}
