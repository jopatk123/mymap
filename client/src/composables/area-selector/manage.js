// 公共管理/控制操作
import { ElMessage, ElMessageBox } from 'element-plus'

export function createManageActions(context, circle, polygon) {
  const { store, isDrawingCircle, isDrawingPolygon } = context
  const { completeCircleDrawing } = circle
  const { finishPolygonDrawing, clearTempLayers } = polygon

  const cancelDrawing = () => {
    if (isDrawingCircle.value) {
      completeCircleDrawing()
    } else if (isDrawingPolygon.value) {
      finishPolygonDrawing()
    }
    try { clearTempLayers() } catch (err) { console.warn('[useAreaSelector] cancelDrawing: clearTempLayers failed', err) }
    ElMessage.info('已取消绘制')
  }

  const finishDrawing = async () => {
    if (isDrawingPolygon.value) {
      // polygon 完成逻辑在 double click 内部处理，这里直接调用完成函数以统一流程
      await polygon.completePolygonDrawing()
      return
    }
    if (isDrawingCircle.value) {
      completeCircleDrawing()
    }
  }

  const clearAllAreas = async () => {
    if (store.areas.length === 0) {
      ElMessage.info('没有可清除的区域')
      return
    }
    try {
      await ElMessageBox.confirm(`确定要清除所有 ${store.areas.length} 个区域吗？`, '确认清除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
      store.clearAllAreas()
      try { clearTempLayers() } catch (err) { console.warn('[useAreaSelector] clearAllAreas: failed to clear temp layers', err) }
      ElMessage.success('已清除所有区域')
    } catch (_) { /* 用户取消 */ }
  }

  const removeArea = async (areaId, areaName) => {
    try {
      await ElMessageBox.confirm(`确定要删除区域"${areaName}"吗？`, '确认删除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
      store.removeArea(areaId)
      ElMessage.success('区域删除成功')
    } catch (_) { /* 用户取消 */ }
  }

  return { cancelDrawing, finishDrawing, clearAllAreas, removeArea }
}
