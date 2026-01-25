<template>
  <div class="info-bar">
    <div class="image-counter">{{ currentIndex + 1 }} / {{ totalImages }}</div>
    <div class="image-info">
      <span v-if="currentImage?.file_name" class="file-name">
        {{ currentImage.file_name }}
      </span>
      <span v-if="currentImage?.file_size" class="file-size">
        {{ formattedFileSize }}
      </span>
    </div>
    <div class="toolbar">
      <el-button-group>
        <el-button :icon="isFullscreen ? 'Minus' : 'FullScreen'" @click="$emit('toggle-fullscreen')">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
        <el-button :icon="Download" @click="$emit('download')">下载</el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Download } from '@element-plus/icons-vue';
import { formatFileSize } from '@/composables/use-image-set-viewer.js';

const props = defineProps({
  currentIndex: {
    type: Number,
    default: 0,
  },
  totalImages: {
    type: Number,
    default: 0,
  },
  currentImage: {
    type: Object,
    default: null,
  },
  isFullscreen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['toggle-fullscreen', 'download']);

const formattedFileSize = computed(() => {
  return formatFileSize(props.currentImage?.file_size);
});
</script>

<style scoped>
.info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #2a2a2a;
  color: white;
}

.image-counter {
  font-size: 14px;
  font-weight: 500;
}

.image-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .info-bar {
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
  }

  .image-info {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .toolbar {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .toolbar .el-button-group {
    display: flex;
    width: 100%;
  }

  .toolbar .el-button-group .el-button {
    flex: 1;
    padding: 8px 12px;
    font-size: 13px;
  }
}

/* 更小屏幕的额外适配 */
@media (max-width: 480px) {
  .image-counter {
    font-size: 12px;
  }
}
</style>
