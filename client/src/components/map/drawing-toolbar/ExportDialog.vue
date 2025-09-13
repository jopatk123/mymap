<template>
  <el-dialog
    v-model="modelValueSync"
    title="导出绘图数据"
    width="520px"
    :close-on-click-modal="false"
    :append-to-body="true"
    :modal="true"
    class="export-dialog"
  >
    <div class="export-content">
      <!-- 数据预览区域 -->
      <div class="data-preview">
        <h4>绘图数据概览</h4>
        <div class="preview-stats">
          <el-row :gutter="12">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ drawingStats.points || 0 }}</div>
                <div class="stat-label">点位</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ drawingStats.lines || 0 }}</div>
                <div class="stat-label">线条</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ drawingStats.polygons || 0 }}</div>
                <div class="stat-label">区域</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ drawingStats.measurements || 0 }}</div>
                <div class="stat-label">测距</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 导出格式选择 -->
      <div class="export-format">
        <h4>导出格式</h4>
        <el-radio-group v-model="exportFormat" class="format-options">
          <el-radio value="kml" class="format-option">
            <div class="format-info">
              <div class="format-name">KML 格式</div>
              <div class="format-desc">适用于 Google Earth 等地理信息软件</div>
            </div>
          </el-radio>
          <el-radio value="csv" class="format-option">
            <div class="format-info">
              <div class="format-name">CSV 格式</div>
              <div class="format-desc">适用于 Excel 等表格处理软件</div>
            </div>
          </el-radio>
          <el-radio value="geojson" class="format-option">
            <div class="format-info">
              <div class="format-name">GeoJSON 格式</div>
              <div class="format-desc">适用于 Web 地图应用和 GIS 软件</div>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 导出选项 -->
      <div class="export-settings">
        <h4>导出选项</h4>
        <el-checkbox-group v-model="exportOptions">
          <el-checkbox value="includeStyles">包含样式信息</el-checkbox>
          <el-checkbox value="includeTimestamp">包含时间戳</el-checkbox>
          <el-checkbox value="compressOutput">压缩输出文件</el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 文件名设置 -->
      <div class="filename-setting">
        <h4>文件名</h4>
        <el-input 
          v-model="exportFilename" 
          placeholder="请输入文件名"
          :suffix-icon="Edit"
        >
          <template #prepend>绘图数据_</template>
          <template #append>.{{ exportFormat }}</template>
        </el-input>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close">取消</el-button>
        <el-button @click="previewData" :disabled="!hasDrawings">预览</el-button>
        <el-button 
          type="primary" 
          @click="exportData" 
          :loading="exporting"
          :disabled="!hasDrawings"
        >
          <el-icon><Download /></el-icon>
          导出下载
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Edit, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDrawingTools } from '@/composables/drawing-tools.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const modelValueSync = ref(props.modelValue)
watch(() => props.modelValue, v => (modelValueSync.value = v))
watch(modelValueSync, v => emit('update:modelValue', v))

// 状态
const exportFormat = ref('kml')
const exporting = ref(false)
const exportOptions = ref(['includeStyles', 'includeTimestamp'])
const exportFilename = ref(`drawing_${new Date().toISOString().split('T')[0]}`)

// 工具
const { drawings, hasDrawings, exportDrawings } = useDrawingTools()

const drawingStats = computed(() => {
  const stats = { points: 0, lines: 0, polygons: 0, measurements: 0 }
  if (drawings && drawings.value) {
    drawings.value.forEach(item => {
      switch (item.type) {
        case 'point': stats.points++; break
        case 'line': stats.lines++; break
        case 'polygon': stats.polygons++; break
        case 'measure': stats.measurements++; break
      }
    })
  }
  return stats
})

const close = () => { modelValueSync.value = false }

const previewData = () => {
  if (!hasDrawings.value) {
    ElMessage.info('暂无绘图数据可预览')
    return
  }
  const s = drawingStats.value
  const total = s.points + s.lines + s.polygons + s.measurements
  const parts = []
  if (s.points) parts.push(`${s.points}个点位`)
  if (s.lines) parts.push(`${s.lines}条线段`)
  if (s.polygons) parts.push(`${s.polygons}个面区域`)
  if (s.measurements) parts.push(`${s.measurements}个测距`)
  ElMessage({ type: 'info', message: `当前绘图数据：共${total}项 (${parts.join('、')})`, duration: 4000 })
}

const exportData = async () => {
  if (!hasDrawings.value) {
    ElMessage.warning('暂无绘图数据可导出')
    return
  }
  try {
    exporting.value = true
    const exportConfig = {
      format: exportFormat.value,
      filename: exportFilename.value || `drawing_${new Date().toISOString().split('T')[0]}`,
      options: {
        includeStyles: exportOptions.value.includes('includeStyles'),
        includeTimestamp: exportOptions.value.includes('includeTimestamp'),
        compressOutput: exportOptions.value.includes('compressOutput')
      }
    }
    // 目前服务只接收格式字符串，保留扩展位
    await exportDrawings(exportConfig.format)
    ElMessage.success(`${exportFormat.value.toUpperCase()} 文件已成功导出`)
    modelValueSync.value = false
  } catch (e) {
    ElMessage.error(`导出失败: ${e.message || e}`)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped lang="scss">
/* 导出对话框样式（仅此组件） */
.export-content { padding: 0; }
.data-preview {
  background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e9ecef;
  h4 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 8px; }
  .preview-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .stat-item { background: #fff; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #ebeef5; }
  .stat-number { font-size: 18px; font-weight: 600; color: #409eff; margin-bottom: 4px; }
  .stat-label { font-size: 12px; color: #666; }
}
.export-format { margin-bottom: 20px; }
.export-format h4,
.export-settings h4,
.filename-setting h4 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 8px; }
.export-settings { margin-bottom: 20px; }
.filename-setting .el-input .el-input__wrapper { border-radius: 6px; }

/* 叠放顺序，确保在最顶层 */
:global(.export-dialog) { z-index: 3000 !important; }
:global(.export-dialog .el-dialog) { margin: 15vh auto !important; max-width: 90vw !important; }
:global(.export-dialog .el-overlay) { z-index: 2999 !important; }
</style>
