<template>
  <div class="drawing-toolbar" :class="{ collapsed: isCollapsed }">
    <!-- 工具栏切换按钮 -->
    <div class="toolbar-toggle" @click="toggleCollapse">
      <el-icon>
        <component :is="isCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
      </el-icon>
    </div>

    <!-- 工具按钮区域 -->
    <div class="toolbar-content" v-show="!isCollapsed">
      <div class="toolbar-title">绘图工具</div>
      
      <div class="tool-buttons">
        <!-- 测距工具 -->
        <el-tooltip content="测距工具" placement="left">
          <el-button
            :type="activeTool === 'measure' ? 'primary' : 'default'"
            :class="{ active: activeTool === 'measure' }"
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

    <!-- 导出对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="导出绘图数据"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="export-options">
        <el-radio-group v-model="exportFormat">
          <el-radio label="kml">KML 格式</el-radio>
          <el-radio label="csv">CSV 格式</el-radio>
        </el-radio-group>
      </div>
      
      <template #footer>
        <el-button @click="showExportDialog = false">取消</el-button>
        <el-button type="primary" @click="exportData" :loading="exporting">
          导出
        </el-button>
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

// 使用绘图工具 composable
const {
  activeTool,
  hasDrawings,
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

const exportData = async () => {
  try {
    exporting.value = true
    await exportDrawings(exportFormat.value)
    ElMessage.success(`${exportFormat.value.toUpperCase()} 文件导出成功`)
    showExportDialog.value = false
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
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
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  cursor: pointer;
  border-radius: 8px 0 0 8px;
  transition: background 0.3s;

  &:hover {
    background: #337ecc;
  }

  .el-icon {
    font-size: 16px;
  }
}

.toolbar-content {
  padding: 16px;
  min-width: 80px;
}

.toolbar-title {
  font-size: 12px;
  color: #606266;
  text-align: center;
  margin-bottom: 12px;
  font-weight: 500;
}

.tool-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.el-button {
  width: 40px;
  height: 40px;
  
  &.active {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  .el-icon {
    font-size: 16px;
  }
}

.divider {
  width: 24px;
  height: 1px;
  background: #dcdfe6;
  margin: 4px 0;
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
      padding: 12px;
    }
    
    .el-button {
      width: 36px;
      height: 36px;
      
      .el-icon {
        font-size: 14px;
      }
    }
  }
}
</style>