import { ref, computed } from 'vue';

// 简化的绘图工具状态管理（仅保留按钮显示需要的状态）
const activeTool = ref(null);
const drawings = ref([]);

export function useDrawingTools() {
  // 计算属性
  const hasDrawings = computed(() => drawings.value.length > 0);

  // 空的初始化函数（保持接口兼容）
  const initializeTools = () => {
    // 不执行任何操作
  };

  // 空的工具激活函数（保持接口兼容）
  const activateTool = (toolType) => {
    activeTool.value = toolType;
    // 不执行任何功能实现
  };

  // 空的工具停用函数（保持接口兼容）
  const deactivateTool = () => {
    activeTool.value = null;
    // 不执行任何功能实现
  };

  // 空的清除函数（保持接口兼容）
  const clearAllDrawings = () => {
    return new Promise((resolve) => {
      drawings.value = [];
      deactivateTool();
      resolve();
    });
  };

  return {
    // 状态
    activeTool,
    hasDrawings,
    drawings,

    // 方法
    initializeTools,
    activateTool,
    deactivateTool,
    clearAllDrawings,
  };
}
