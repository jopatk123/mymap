<template>
  <div class="drawing-toolbar" :class="{ collapsed: isCollapsed }">
    <!-- 折叠时显示的外部切换按钮（保持可展开） -->
    <div class="toolbar-toggle" v-show="isCollapsed" @click="toggleCollapse">
      <el-icon>
        <component :is="isCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
      </el-icon>
    </div>

    <!-- 工具按钮区域 -->
    <div class="toolbar-content" v-show="!isCollapsed">
      <div class="tool-buttons">
        <!-- 展开时内嵌的切换按钮（位于工具列顶部） -->
        <div class="toolbar-toggle-inline" @click="toggleCollapse" role="button" tabindex="0">
          <el-icon>
            <component :is="isCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
          </el-icon>
        </div>
        <!-- 测距工具 -->
        <el-tooltip content="测距工具" placement="left">
            <el-button
              :type="activeTool === 'measure' ? 'primary' : 'default'"
              :class="[{ active: activeTool === 'measure' }, 'btn-measure']"
              @click="toggleTool('measure')"
              circle
            >
              <el-icon><Compass /></el-icon>
            </el-button>
        </el-tooltip>

        <!-- 添加点工具 -->
        <el-tooltip content="添加点" placement="left">
          <el-button
            :type="activeTool === 'point' ? 'primary' : 'default'"
            :class="{ active: activeTool === 'point' }"
            @click="toggleTool('point')"
            circle
          >
            <el-icon><Location /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 添加线工具 -->
        <el-tooltip content="添加线" placement="left">
          <el-button
            :type="activeTool === 'line' ? 'primary' : 'default'"
            :class="{ active: activeTool === 'line' }"
            @click="toggleTool('line')"
            circle
          >
            <el-icon><Minus /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 添加面工具 -->
        <el-tooltip content="添加面" placement="left">
          <el-button
            :type="activeTool === 'polygon' ? 'primary' : 'default'"
            :class="{ active: activeTool === 'polygon' }"
            @click="toggleTool('polygon')"
            circle
          >
            <el-icon><Operation /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 画笔工具 -->
        <el-tooltip 
          :content="activeTool === 'draw' ? '画笔工具 (地图拖拽已禁用)' : '画笔工具'" 
          placement="left"
        >
          <el-button
            :type="activeTool === 'draw' ? 'primary' : 'default'"
            :class="{ 
              active: activeTool === 'draw',
              'draw-tool-active': activeTool === 'draw'
            }"
            @click="toggleTool('draw')"
            circle
          >
            <el-icon><Edit /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 分割线 -->
        <div class="divider"></div>

        <!-- 清除工具 -->
        <el-tooltip content="清除所有" placement="left">
          <el-button
            type="danger"
            @click="clearAll"
            :disabled="!hasDrawings"
            circle
            class="btn-clear"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 保存工具 -->
        <el-tooltip content="导出保存" placement="left">
          <el-button
            type="success"
            @click="showExportDialog = true"
            :disabled="!hasDrawings"
            circle
          >
            <el-icon><Download /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 优化的导出对话框 -->
    <el-dialog
      v-model="showExportDialog"
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
            <el-radio label="kml" class="format-option">
              <div class="format-info">
                <div class="format-name">KML 格式</div>
                <div class="format-desc">适用于 Google Earth 等地理信息软件</div>
              </div>
            </el-radio>
            <el-radio label="csv" class="format-option">
              <div class="format-info">
                <div class="format-name">CSV 格式</div>
                <div class="format-desc">适用于 Excel 等表格处理软件</div>
              </div>
            </el-radio>
            <el-radio label="geojson" class="format-option">
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
            <el-checkbox label="includeStyles">包含样式信息</el-checkbox>
            <el-checkbox label="includeTimestamp">包含时间戳</el-checkbox>
            <el-checkbox label="compressOutput">压缩输出文件</el-checkbox>
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
          <el-button @click="showExportDialog = false">取消</el-button>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  ArrowLeft, 
  ArrowRight, 
  Compass, 
  Location, 
  Minus, 
  Operation, 
  Edit, 
  Delete, 
  Download 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDrawingTools } from '@/composables/drawing-tools.js'

// Props
const props = defineProps({
  mapInstance: {
    type: Object,
    default: null
  }
})

// 响应式状态
const isCollapsed = ref(false)
const showExportDialog = ref(false)
const exportFormat = ref('kml')
const exporting = ref(false)

// 新增的导出对话框相关状态
const exportOptions = ref(['includeStyles', 'includeTimestamp'])
const exportFilename = ref(`drawing_${new Date().toISOString().split('T')[0]}`)

// 绘图数据统计
const drawingStats = computed(() => {
  const stats = {
    points: 0,
    lines: 0,
    polygons: 0,
    measurements: 0
  }
  
  // 从 useDrawingTools 获取绘图数据并统计
  if (drawings && drawings.value) {
    drawings.value.forEach(item => {
      switch (item.type) {
        case 'point':
          stats.points++
          break
        case 'line':
          stats.lines++
          break
        case 'polygon':
          stats.polygons++
          break
        case 'measure':
          stats.measurements++
          break
      }
    })
  }
  
  return stats
})

// 使用绘图工具 composable
const {
  activeTool,
  hasDrawings,
  drawings,
  initializeTools,
  activateTool,
  deactivateTool,
  clearAllDrawings,
  exportDrawings
} = useDrawingTools()

// 计算属性和方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleTool = (toolType) => {
  console.log('toggleTool called with:', toolType, 'mapInstance:', props.mapInstance)
  
  if (activeTool.value === toolType) {
    deactivateTool()
  } else {
    if (!props.mapInstance) {
      ElMessage.warning('地图尚未加载完成，请稍后再试')
      return
    }
    activateTool(toolType, props.mapInstance)
  }
}

const clearAll = async () => {
  try {
    await clearAllDrawings()
    ElMessage.success('已清除所有绘图内容')
  } catch (error) {
    ElMessage.error('清除失败: ' + error.message)
  }
}

// 预览数据方法
const previewData = () => {
  if (!hasDrawings.value) {
    ElMessage.info('暂无绘图数据可预览')
    return
  }
  
  const stats = drawingStats.value
  const totalItems = stats.points + stats.lines + stats.polygons + stats.measurements
  
  const details = []
  if (stats.points > 0) details.push(`${stats.points}个点位`)
  if (stats.lines > 0) details.push(`${stats.lines}条线段`)
  if (stats.polygons > 0) details.push(`${stats.polygons}个面区域`)  
  if (stats.measurements > 0) details.push(`${stats.measurements}个测距`)
  
  ElMessage({
    type: 'info',
    message: `当前绘图数据：共${totalItems}项 (${details.join('、')})`,
    duration: 4000
  })
}

// 优化的导出方法
const exportData = async () => {
  if (!hasDrawings.value) {
    ElMessage.warning('暂无绘图数据可导出')
    return
  }
  
  try {
    exporting.value = true
    
    // 构建导出配置
    const exportConfig = {
      format: exportFormat.value,
      filename: exportFilename.value || `drawing_${new Date().toISOString().split('T')[0]}`,
      options: {
        includeStyles: exportOptions.value.includes('includeStyles'),
        includeTimestamp: exportOptions.value.includes('includeTimestamp'), 
        compressOutput: exportOptions.value.includes('compressOutput')
      }
    }
    
    await exportDrawings(exportConfig.format)
    
    ElMessage({
      type: 'success',
      message: `${exportFormat.value.toUpperCase()} 文件已成功导出`,
      duration: 3000
    })
    
    showExportDialog.value = false
    
    // 重置文件名为新的时间戳
    exportFilename.value = `drawing_${new Date().toISOString().split('T')[0]}`
    
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  } finally {
    exporting.value = false
  }
}

// 监听地图实例变化
import { watch, nextTick } from 'vue'
watch(() => props.mapInstance, async (newMap, oldMap) => {
  console.log('地图实例变化:', oldMap, '=>', newMap)
  if (newMap) {
    // 等待下一个tick确保地图完全渲染
    await nextTick()
    console.log('初始化绘图工具')
    initializeTools(newMap)
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
/* 测距工具样式 */
:global(.measure-marker) {
  background: transparent;
  border: none;
}

:global(.measure-point) {
  background: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.drawing-toolbar {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border-radius: 8px;
  box-shadow: none; /* 移除阴影，因为透明背景不需要 */
  z-index: 1000;
  transition: all 0.3s ease;
  display: flex;
  align-items: stretch;

  &.collapsed {
    .toolbar-toggle {
      border-radius: 8px;
    }
  }
}

.toolbar-toggle {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  cursor: pointer;
  border-radius: 8px 0 0 8px;
  transition: background 0.3s;
  flex-shrink: 0;

  &:hover {
    background: #337ecc;
  }

  .el-icon {
    font-size: 14px;
  }
}

.toolbar-toggle-inline {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 6px;
  transform: translateX(-2px); /* 微微左移以与按钮视觉对齐 */
  box-shadow: 0 1px 4px rgba(64,158,255,0.15);

  .el-icon {
    font-size: 14px;
  }
}

.toolbar-content {
  padding: 6px 6px !important; /* 左右padding相等确保居中 */
  min-width: 48px !important;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tool-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
}

/* 确保所有按钮完全居中对齐 */
.tool-buttons > * {
  margin-left: 0 !important;
  margin-right: 0 !important;
  align-self: center !important;
}

/* 特别处理内联切换按钮的对齐 */
.toolbar-toggle-inline {
  align-self: center !important;
  transform: none !important; /* 移除之前的左移 */
}

.el-button {
  width: 36px;
  height: 36px;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  border-radius: 50% !important;
  margin: 0 !important; /* 确保没有额外margin */
  
  &.active {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.divider {
  width: 20px;
  height: 1px;
  background: #dcdfe6;
  margin: 2px 0;
}

/* 确保危险/成功按钮的圆形和其它按钮一致并垂直对齐 */
.el-button[type="danger"],
.el-button.is-danger,
.el-button[type="success"],
.el-button.is-success {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 导出对话框样式 */
.export-content {
  padding: 0;
  
  .data-preview {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    border: 1px solid #e9ecef;
    
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-icon {
        color: #409eff;
      }
    }
    
    .preview-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      
      .stat-item {
        background: white;
        padding: 12px;
        border-radius: 6px;
        text-align: center;
        border: 1px solid #ebeef5;
        
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #409eff;
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }
  
  .export-format {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-icon {
        color: #67c23a;
      }
    }
    
    .el-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .el-radio {
        margin: 0;
        
        .el-radio__label {
          font-size: 13px;
          color: #666;
        }
        
        &.is-checked .el-radio__label {
          color: #409eff;
        }
      }
    }
  }
  
  .export-settings {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-icon {
        color: #e6a23c;
      }
    }
    
    .el-checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .el-checkbox {
        margin: 0;
        
        .el-checkbox__label {
          font-size: 13px;
          color: #666;
        }
        
        &.is-checked .el-checkbox__label {
          color: #409eff;
        }
      }
    }
  }
  
  .filename-setting {
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-icon {
        color: #909399;
      }
    }
    
    .el-input {
      .el-input__wrapper {
        border-radius: 6px;
        
        &:hover {
          box-shadow: 0 0 0 1px #c0c4cc inset;
        }
        
        &.is-focus {
          box-shadow: 0 0 0 1px #409eff inset;
        }
      }
    }
  }
}

.export-options {
  padding: 16px 0;
  
  .el-radio-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

// 画笔工具特殊状态样式
.el-button.draw-tool-active {
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #f56c6c;
    border-radius: 50%;
    border: 1px solid white;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  }
}

// 移动端适配
@media (max-width: 768px) {
  .drawing-toolbar {
    right: 10px;
    
    .toolbar-content {
      padding: 6px;
    }
    
    .el-button {
      width: 32px;
      height: 32px;
      
      .el-icon {
        font-size: 12px;
      }
    }
    
    .toolbar-toggle {
      width: 32px;
      height: 32px;
      
      .el-icon {
        font-size: 12px;
      }
    }
  }
}

/* 导出对话框全局样式 */
:global(.export-dialog) {
  z-index: 3000 !important; /* 确保对话框在最顶层 */
}

:global(.export-dialog .el-dialog) {
  margin: 15vh auto !important;
  max-width: 90vw !important;
}

:global(.export-dialog .el-overlay) {
  z-index: 2999 !important;
}
</style>