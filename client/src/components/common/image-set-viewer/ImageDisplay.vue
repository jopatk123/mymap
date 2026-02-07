<template>
  <div class="main-image-area" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <div class="image-wrapper">
      <img
        v-if="currentImage"
        :src="currentImage.image_url || currentImage.imageUrl"
        :alt="currentImage.file_name || '图片'"
        class="main-image"
        @click="$emit('image-click')"
      />
      <div v-else-if="!loading" class="no-image">
        <el-icon size="64"><Picture /></el-icon>
        <span>暂无图片</span>
      </div>
    </div>

    <!-- 导航按钮 -->
    <button
      v-if="hasMultipleImages"
      class="nav-btn prev"
      :disabled="isFirstImage"
      @click="$emit('prev')"
    >
      <el-icon><ArrowLeft /></el-icon>
    </button>
    <button
      v-if="hasMultipleImages"
      class="nav-btn next"
      :disabled="isLastImage"
      @click="$emit('next')"
    >
      <el-icon><ArrowRight /></el-icon>
    </button>
  </div>
</template>

<script setup>
import { Picture, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useTouchSwipe } from '@/composables/use-image-set-viewer.js';

const props = defineProps({
  currentImage: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasMultipleImages: {
    type: Boolean,
    default: false,
  },
  isFirstImage: {
    type: Boolean,
    default: true,
  },
  isLastImage: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['prev', 'next', 'image-click']);

// 触摸滑动支持
const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchSwipe({
  onSwipeLeft: () => emit('next'),
  onSwipeRight: () => emit('prev'),
});

const onTouchStart = handleTouchStart;
const onTouchMove = handleTouchMove;
const onTouchEnd = handleTouchEnd;
</script>

<style scoped>
.main-image-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0; /* 关键：允许 flex 子元素缩小 */
}

.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  cursor: pointer;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  gap: 16px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 24px;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.8);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-btn.prev {
  left: 20px;
}

.nav-btn.next {
  right: 20px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .nav-btn {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .nav-btn.prev {
    left: 8px;
  }

  .nav-btn.next {
    right: 8px;
  }
}

/* 更小屏幕的额外适配 */
@media (max-width: 480px) {
  .nav-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .nav-btn.prev {
    left: 4px;
  }

  .nav-btn.next {
    right: 4px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .nav-btn {
    opacity: 0.8;
  }

  .nav-btn:active {
    background: rgba(0, 0, 0, 0.8);
    transform: translateY(-50%) scale(0.95);
  }
}
</style>
