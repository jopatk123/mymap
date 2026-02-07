<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div v-if="visible" class="image-preview-overlay" @click.self="handleClose">
        <div class="preview-container">
          <!-- 工具栏 -->
          <div class="preview-toolbar">
            <div class="toolbar-left">
              <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
            </div>
            <div class="toolbar-center">
              <el-button-group>
                <el-button :icon="ZoomOut" @click="zoomOut" :disabled="scale <= 0.5">
                  缩小
                </el-button>
                <el-button @click="resetZoom">重置</el-button>
                <el-button :icon="ZoomIn" @click="zoomIn" :disabled="scale >= 5">
                  放大
                </el-button>
              </el-button-group>
            </div>
            <div class="toolbar-right">
              <el-button :icon="Close" circle @click="handleClose"></el-button>
            </div>
          </div>

          <!-- 图片容器 -->
          <div
            ref="imageContainerRef"
            class="image-container"
            @wheel.prevent="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <img
              ref="imageRef"
              :src="imageUrl"
              :alt="imageAlt"
              :style="imageStyle"
              @load="handleImageLoad"
              draggable="false"
            />
          </div>

          <!-- 提示信息 -->
          <div class="preview-hint">
            滚轮缩放 · 拖拽移动 · ESC 关闭
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ZoomIn, ZoomOut, Close } from '@element-plus/icons-vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  imageUrl: {
    type: String,
    default: '',
  },
  imageAlt: {
    type: String,
    default: '图片预览',
  },
});

const emit = defineEmits(['update:visible', 'close']);

// 缩放和位置
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

// DOM 引用
const imageContainerRef = ref(null);
const imageRef = ref(null);

// 拖拽状态
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartTranslateX = ref(0);
const dragStartTranslateY = ref(0);

// 触摸状态
const lastTouchDistance = ref(0);

// 图片样式
const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: isDragging.value ? 'grabbing' : 'grab',
}));

// 缩放方法
const zoomIn = () => {
  if (scale.value < 5) {
    scale.value = Math.min(5, scale.value * 1.2);
  }
};

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(0.5, scale.value / 1.2);
  }
};

const resetZoom = () => {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
};

// 滚轮缩放
const handleWheel = (e) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = scale.value * delta;
  
  if (newScale >= 0.5 && newScale <= 5) {
    scale.value = newScale;
  }
};

// 鼠标拖拽
const handleMouseDown = (e) => {
  if (scale.value <= 1) return; // 只有放大时才能拖拽
  
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragStartTranslateX.value = translateX.value;
  dragStartTranslateY.value = translateY.value;
};

const handleMouseMove = (e) => {
  if (!isDragging.value) return;
  
  const deltaX = e.clientX - dragStartX.value;
  const deltaY = e.clientY - dragStartY.value;
  
  translateX.value = dragStartTranslateX.value + deltaX;
  translateY.value = dragStartTranslateY.value + deltaY;
};

const handleMouseUp = () => {
  isDragging.value = false;
};

// 触摸缩放和拖拽
const handleTouchStart = (e) => {
  if (e.touches.length === 2) {
    // 双指缩放
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    lastTouchDistance.value = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
  } else if (e.touches.length === 1 && scale.value > 1) {
    // 单指拖拽（仅在放大时）
    isDragging.value = true;
    dragStartX.value = e.touches[0].clientX;
    dragStartY.value = e.touches[0].clientY;
    dragStartTranslateX.value = translateX.value;
    dragStartTranslateY.value = translateY.value;
  }
};

const handleTouchMove = (e) => {
  e.preventDefault();
  
  if (e.touches.length === 2) {
    // 双指缩放
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    if (lastTouchDistance.value > 0) {
      const scaleChange = currentDistance / lastTouchDistance.value;
      const newScale = scale.value * scaleChange;
      if (newScale >= 0.5 && newScale <= 5) {
        scale.value = newScale;
      }
    }
    
    lastTouchDistance.value = currentDistance;
  } else if (e.touches.length === 1 && isDragging.value) {
    // 单指拖拽
    const deltaX = e.touches[0].clientX - dragStartX.value;
    const deltaY = e.touches[0].clientY - dragStartY.value;
    
    translateX.value = dragStartTranslateX.value + deltaX;
    translateY.value = dragStartTranslateY.value + deltaY;
  }
};

const handleTouchEnd = () => {
  isDragging.value = false;
  lastTouchDistance.value = 0;
};

// 图片加载完成
const handleImageLoad = () => {
  // 图片加载完成后重置状态
  resetZoom();
};

// 关闭预览
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
  // 延迟重置状态，等待动画完成
  setTimeout(() => {
    resetZoom();
  }, 300);
};

// 键盘事件
const handleKeydown = (e) => {
  if (!props.visible) return;
  
  switch (e.key) {
    case 'Escape':
      handleClose();
      break;
    case '+':
    case '=':
      zoomIn();
      break;
    case '-':
    case '_':
      zoomOut();
      break;
    case '0':
      resetZoom();
      break;
  }
};

// 监听可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  color: white;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.toolbar-center {
  justify-content: center;
}

.toolbar-right {
  justify-content: flex-end;
}

.zoom-level {
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  touch-action: none;
}

.image-container img {
  max-width: 90%;
  max-height: 90%;
  transition: transform 0.1s ease-out;
  user-select: none;
  -webkit-user-select: none;
}

.preview-hint {
  padding: 12px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  background: rgba(0, 0, 0, 0.3);
}

/* 过渡动画 */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.3s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .preview-toolbar {
    padding: 12px 16px;
  }

  .toolbar-center .el-button-group {
    transform: scale(0.9);
  }

  .zoom-level {
    font-size: 12px;
    min-width: 50px;
  }

  .preview-hint {
    padding: 8px 16px;
    font-size: 11px;
  }

  .image-container img {
    max-width: 95%;
    max-height: 95%;
  }
}

/* 更小屏幕的适配 */
@media (max-width: 480px) {
  .preview-toolbar {
    padding: 8px 12px;
  }

  .toolbar-center .el-button {
    padding: 8px 12px;
    font-size: 12px;
  }

  .toolbar-left {
    flex: 0.5;
  }

  .toolbar-right {
    flex: 0.5;
  }
}
</style>
