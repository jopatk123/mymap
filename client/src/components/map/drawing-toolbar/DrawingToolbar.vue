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
        @export-kml="exportKml"
      />
    </div>

    <!-- 移除交互管理器，因为没有功能实现 -->
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useDrawingTools } from '@/composables/drawing-tools.js';
import ToolbarButtons from './ToolbarButtons.vue';

// Props
const props = defineProps({
  mapInstance: {
    type: Object,
    default: null,
  },
  setMarkerInteractivity: {
    type: Function,
    default: null,
  },
});

// 响应式状态
const isCollapsed = ref(false);

// 使用绘图工具 composable
const {
  activeTool,
  hasDrawings,
  initializeTools,
  setMarkerInteractivityHandler,
  activateTool,
  deactivateTool,
  clearAllDrawings,
  exportToKml,
} = useDrawingTools();

// 计算属性和方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const toggleTool = (toolType) => {
  // 仅切换按钮状态，不执行实际功能
  if (activeTool.value === toolType) {
    deactivateTool();
  } else {
    activateTool(toolType);
  }
};

const clearAll = async () => {
  await clearAllDrawings();
};

const exportKml = (format) => {
  // format may be 'kml' or 'csv'
  exportToKml(format || 'kml');
};

// 监听地图实例变化，初始化绘图工具
watch(
  () => props.mapInstance,
  (newMapInstance) => {
    if (newMapInstance) {
      initializeTools(newMapInstance, {
        setMarkerInteractivity: props.setMarkerInteractivity,
      });
    }
  },
  { immediate: true }
);

watch(
  () => props.setMarkerInteractivity,
  (handler) => {
    setMarkerInteractivityHandler(handler);
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
/* 简化后的样式，仅保留工具栏布局 */

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
