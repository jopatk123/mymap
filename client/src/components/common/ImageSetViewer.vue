<template>
  <el-dialog
    v-model="visible"
    :title="imageSet?.title || '图片集'"
    width="90%"
    :fullscreen="isFullscreen || isMobile"
    destroy-on-close
    class="image-set-viewer-dialog"
    :class="{ 'mobile-dialog': isMobile }"
    @close="handleClose"
  >
    <div class="viewer-container" :class="{ fullscreen: isFullscreen }">
      <!-- 加载状态 -->
      <LoadingOverlay :loading="loading" />

      <!-- 主图展示区 -->
      <ImageDisplay
        :current-image="currentImage"
        :loading="loading"
        :has-multiple-images="hasMultipleImages"
        :is-first-image="isFirstImage"
        :is-last-image="isLastImage"
        @prev="prevImage"
        @next="nextImage"
        @image-click="handleImageClick"
      />

      <!-- 图片信息栏 -->
      <ImageInfoBar
        :current-index="currentIndex"
        :total-images="images.length"
        :current-image="currentImage"
        :is-fullscreen="isFullscreen"
        @toggle-fullscreen="toggleFullscreen"
        @download="handleDownload"
      />

      <!-- 缩略图列表 -->
      <ThumbnailStrip :images="images" :current-index="currentIndex" @select="goToImage" />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <span v-if="imageSet?.description" class="description">
          {{ imageSet.description }}
        </span>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  ImageDisplay,
  ImageInfoBar,
  ThumbnailStrip,
  LoadingOverlay,
} from './image-set-viewer/index.js';
import {
  useImageNavigation,
  useImageSetData,
  useMobileDetection,
  useKeyboardNavigation,
  downloadImage,
} from '@/composables/use-image-set-viewer.js';

const props = defineProps({
  modelValue: Boolean,
  imageSetId: {
    type: [Number, String],
    default: null,
  },
  initialImageSet: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'close']);

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// 全屏状态
const isFullscreen = ref(false);

// 使用 composables
const { isMobile } = useMobileDetection();
const { imageSet, images, loading, loadImageSet } = useImageSetData(props);
const {
  currentIndex,
  currentImage,
  hasMultipleImages,
  isFirstImage,
  isLastImage,
  prevImage,
  nextImage,
  goToImage,
  resetIndex,
} = useImageNavigation(images);

// 键盘导航
useKeyboardNavigation({
  visible,
  isFullscreen,
  onPrev: prevImage,
  onNext: nextImage,
  onClose: handleClose,
  onExitFullscreen: () => {
    isFullscreen.value = false;
  },
});

// 监听 modelValue 变化，打开时加载数据
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      resetIndex();
      loadImageSet();
    }
  }
);

// 切换全屏
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 下载当前图片
const handleDownload = () => {
  downloadImage(currentImage.value, currentIndex.value);
};

// 点击图片（预留扩展）
const handleImageClick = () => {
  // 可以添加放大查看等功能
};

// 关闭处理
function handleClose() {
  visible.value = false;
  emit('close');
}
</script>

<style scoped>
.image-set-viewer-dialog :deep(.el-dialog__body) {
  padding: 0;
}

/* 移动端对话框全屏模式 */
.mobile-dialog :deep(.el-dialog) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  height: 100vh;
  border-radius: 0;
}

.viewer-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  background: #1a1a1a;
  position: relative;
}

.viewer-container.fullscreen {
  height: calc(100vh - 100px);
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.description {
  color: #666;
  font-size: 14px;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .image-set-viewer-dialog :deep(.el-dialog) {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    height: 100vh;
    border-radius: 0;
  }

  .image-set-viewer-dialog :deep(.el-dialog__header) {
    padding: 12px 16px;
  }

  .image-set-viewer-dialog :deep(.el-dialog__title) {
    font-size: 16px;
  }

  .image-set-viewer-dialog :deep(.el-dialog__footer) {
    padding: 12px 16px;
  }

  .viewer-container {
    height: calc(100vh - 130px);
  }

  .viewer-container.fullscreen {
    height: calc(100vh - 60px);
  }

  .dialog-footer {
    flex-direction: column;
    gap: 8px;
  }

  .description {
    max-width: 100%;
    text-align: center;
  }
}
</style>
