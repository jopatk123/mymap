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

    <!-- 导出对话框（子组件） -->
    <ExportDialog v-model="showExportDialog" />
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
  Download,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDrawingTools } from '@/composables/drawing-tools.js'
import ExportDialog from './ExportDialog.vue'
// 调试开关与小工具（与 composable 保持一致）
const DEBUG = false
function dlog(...args) { if (DEBUG) console.log(...args) }

// Props
const props = defineProps({
  mapInstance: {
    type: Object,
    default: null
  }
})

// 响应式状态
const isCollapsed = ref(false)
// 导出弹窗显隐
const showExportDialog = ref(false)

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
  dlog('toggleTool called with:', toolType, 'mapInstance:', props.mapInstance)
  
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

// 删除导出相关逻辑，改由子组件处理

// 监听地图实例变化
import { watch, nextTick } from 'vue'
watch(() => props.mapInstance, async (newMap, oldMap) => {
  dlog('地图实例变化:', oldMap, '=>', newMap)
  if (newMap) {
    // 等待下一个tick确保地图完全渲染
    await nextTick()
    dlog('初始化绘图工具')
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

/* 移除导出对话框样式，已迁移到子组件 */

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

/* 导出对话框全局样式移至子组件 */
</style>