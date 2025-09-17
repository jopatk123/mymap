// 共享状态（模块级单例），供各工具模块复用
import { ref } from 'vue';

export const activeTool = ref(null);
export const drawings = ref([]);

// 使用对象包装，便于跨模块可变共享（避免对 import 绑定直接赋值的限制）
export const state = {
  mapInstance: null,
  drawingLayer: null,
  currentPath: null,
  isDrawing: false,
  measureTooltip: null,
};
