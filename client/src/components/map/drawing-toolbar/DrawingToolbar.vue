<!-- 重构后的绘图工具栏主组件 -->
<template>
  <div class="drawing-toolbar" :class="{ collapsed: isCollapsed }">
    <!-- 折叠时显示的外部切换按钮（保持可展开） -->
    <div v-show="isCollapsed" class="toolbar-toggle" @click="toggleCollapse">
      <el-icon>
        <component :is="isCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
      </el-icon>
    </div>

    <!-- 工具按钮区域 -->
    <div v-show="!isCollapsed" class="toolbar-content">
      <ToolbarButtons
        :active-tool="activeTool"
        :has-drawings="hasDrawings"
        :is-collapsed="isCollapsed"
        @toggle-collapse="toggleCollapse"
        @toggle-tool="toggleTool"
        @clear-all="clearAll"
        @show-export="handleShowExport"
      />
    </div>

    <!-- 交互管理器 -->
    <InteractiveManager
      ref="interactiveManagerRef"
      :map-instance="mapInstance"
      :drawings="drawings"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { useDrawingTools } from '@/composables/drawing-tools.js';
import ToolbarButtons from './ToolbarButtons.vue';
import InteractiveManager from './InteractiveManager.vue';

import { dlog } from '@/composables/drawing-tools/utils/debug.js';

// Props
const props = defineProps({
  mapInstance: {
    type: Object,
    default: null,
  },
});

// 响应式状态
const isCollapsed = ref(false);
const interactiveManagerRef = ref(null);

// 使用绘图工具 composable
const {
  activeTool,
  hasDrawings,
  drawings,
  initializeTools,
  activateTool,
  deactivateTool,
  clearAllDrawings,
  // exportDrawings is intentionally not used directly in this component
  exportDrawings: _exportDrawings,
} = useDrawingTools();

// 计算属性和方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const toggleTool = (toolType) => {
  dlog('toggleTool called with:', toolType, 'mapInstance:', props.mapInstance);

  if (activeTool.value === toolType) {
    deactivateTool();
  } else {
    if (!props.mapInstance) {
      ElMessage.warning('地图尚未加载完成，请稍后再试');
      return;
    }
    activateTool(toolType, props.mapInstance);
  }
};

const clearAll = async () => {
  try {
    await clearAllDrawings();
    ElMessage.success('已清除所有绘图内容');
  } catch (error) {
    ElMessage.error('清除失败: ' + error.message);
  }
};

const handleShowExport = () => {
  if (interactiveManagerRef.value) {
    interactiveManagerRef.value.handleShowExport();
  }
};

// Mark intentionally unused import as referenced for linter
void _exportDrawings;

// 监听地图实例变化
watch(
  () => props.mapInstance,
  async (newMap, oldMap) => {
    dlog('地图实例变化:', oldMap, '=>', newMap);
    if (newMap) {
      // 等待下一个tick确保地图完全渲染
      // 等待 DOM / 子组件多次 tick，确保 interactiveManagerRef 被挂载
      await nextTick();
      await nextTick();
      dlog('初始化绘图工具');
      initializeTools(newMap);

      // 如果 interactiveManagerRef 还不可用，继续等待一次微任务再尝试
      if (!interactiveManagerRef.value) {
        dlog('interactiveManagerRef not ready, waiting another tick');
        await nextTick();
      }

      // 设置事件监听（在 manager 可用后绑定）
      setupEventListeners(newMap);
    }
  },
  { immediate: true }
);

// 设置事件监听
const setupEventListeners = (map) => {
  if (!interactiveManagerRef.value) return;

  const manager = interactiveManagerRef.value;

  // 监听点位事件
  if (manager.handlePointClick && manager.handlePointContextMenu) {
    map.on('point:click', manager.handlePointClick);
    map.on('point:contextmenu', manager.handlePointContextMenu);
    dlog('bound point:click and point:contextmenu on map');
  } else {
    dlog(
      'point handlers missing on manager:',
      !!manager.handlePointClick,
      !!manager.handlePointContextMenu
    );
  }

  // 监听线段事件
  if (manager.handleLineClick && manager.handleLineContextMenu) {
    map.on('line:click', manager.handleLineClick);
    map.on('line:contextmenu', manager.handleLineContextMenu);
    dlog('bound line:click and line:contextmenu on map');
  } else {
    dlog(
      'line handlers missing on manager:',
      !!manager.handleLineClick,
      !!manager.handleLineContextMenu
    );
  }

  // 监听面域事件
  if (manager.handlePolygonClick && manager.handlePolygonContextMenu) {
    map.on('polygon:click', manager.handlePolygonClick);
    map.on('polygon:contextmenu', manager.handlePolygonContextMenu);
    dlog('bound polygon:click and polygon:contextmenu on map');
  } else {
    dlog(
      'polygon handlers missing on manager:',
      !!manager.handlePolygonClick,
      !!manager.handlePolygonContextMenu
    );
  }
};
</script>

<style lang="scss" scoped>
@use './point-tools.scss';

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

.toolbar-content {
  padding: 6px 6px !important; /* 左右padding相等确保居中 */
  min-width: 48px !important;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// 移动端适配
@media (max-width: 768px) {
  .drawing-toolbar {
    right: 10px;

    .toolbar-content {
      padding: 6px;
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
</style>
