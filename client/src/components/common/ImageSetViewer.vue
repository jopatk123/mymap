<template>
  <el-dialog
    v-model="visible"
    :title="imageSet?.title || '图片集'"
    width="90%"
    :fullscreen="isFullscreen"
    destroy-on-close
    class="image-set-viewer-dialog"
    @close="handleClose"
  >
    <div class="viewer-container" :class="{ fullscreen: isFullscreen }">
      <!-- 主图展示区 -->
      <div class="main-image-area">
        <div class="image-wrapper">
          <img
            v-if="currentImage"
            :src="currentImage.image_url || currentImage.imageUrl"
            :alt="currentImage.file_name || '图片'"
            class="main-image"
            @click="handleImageClick"
          />
          <div v-else class="no-image">
            <el-icon size="64"><Picture /></el-icon>
            <span>暂无图片</span>
          </div>
        </div>

        <!-- 导航按钮 -->
        <button
          v-if="images.length > 1"
          class="nav-btn prev"
          :disabled="currentIndex === 0"
          @click="prevImage"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <button
          v-if="images.length > 1"
          class="nav-btn next"
          :disabled="currentIndex === images.length - 1"
          @click="nextImage"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>

      <!-- 图片信息栏 -->
      <div class="info-bar">
        <div class="image-counter">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>
        <div class="image-info">
          <span v-if="currentImage?.file_name" class="file-name">
            {{ currentImage.file_name }}
          </span>
          <span v-if="currentImage?.file_size" class="file-size">
            {{ formatFileSize(currentImage.file_size) }}
          </span>
        </div>
        <div class="toolbar">
          <el-button-group>
            <el-button :icon="isFullscreen ? 'Minus' : 'FullScreen'" @click="toggleFullscreen">
              {{ isFullscreen ? '退出全屏' : '全屏' }}
            </el-button>
            <el-button :icon="Download" @click="downloadImage">下载</el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 缩略图列表 -->
      <div v-if="images.length > 1" class="thumbnail-strip">
        <div
          v-for="(img, index) in images"
          :key="img.id"
          class="thumbnail-item"
          :class="{ active: index === currentIndex }"
          @click="goToImage(index)"
        >
          <img
            :src="img.thumbnail_url || img.thumbnailUrl || img.image_url || img.imageUrl"
            :alt="`图片 ${index + 1}`"
          />
        </div>
      </div>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Picture, ArrowLeft, ArrowRight, Download } from '@element-plus/icons-vue';
import { imageSetApi } from '@/api/image-set.js';
import { ElMessage } from 'element-plus';

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

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const imageSet = ref(null);
const images = ref([]);
const currentIndex = ref(0);
const isFullscreen = ref(false);
const loading = ref(false);

const currentImage = computed(() => {
  return images.value[currentIndex.value] || null;
});

// 加载图片集详情
const loadImageSet = async () => {
  if (props.initialImageSet) {
    imageSet.value = props.initialImageSet;
    images.value = props.initialImageSet.images || [];
    return;
  }

  if (!props.imageSetId) return;

  loading.value = true;
  try {
    const response = await imageSetApi.getImageSet(props.imageSetId);
    if (response.data?.success) {
      imageSet.value = response.data.data;
      images.value = response.data.data.images || [];
    }
  } catch (error) {
    console.error('加载图片集失败:', error);
    ElMessage.error('加载图片集失败');
  } finally {
    loading.value = false;
  }
};

// 监听 modelValue 变化，打开时加载数据
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      currentIndex.value = 0;
      loadImageSet();
    }
  }
);

// 切换图片
const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextImage = () => {
  if (currentIndex.value < images.value.length - 1) {
    currentIndex.value++;
  }
};

const goToImage = (index) => {
  currentIndex.value = index;
};

// 键盘导航
const handleKeydown = (e) => {
  if (!visible.value) return;

  switch (e.key) {
    case 'ArrowLeft':
      prevImage();
      break;
    case 'ArrowRight':
      nextImage();
      break;
    case 'Escape':
      if (isFullscreen.value) {
        isFullscreen.value = false;
      } else {
        handleClose();
      }
      break;
  }
};

// 切换全屏
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 下载当前图片
const downloadImage = () => {
  if (!currentImage.value) return;

  const url = currentImage.value.image_url || currentImage.value.imageUrl;
  const filename = currentImage.value.file_name || `image-${currentIndex.value + 1}.jpg`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 点击图片（预留扩展）
const handleImageClick = () => {
  // 可以添加放大查看等功能
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 关闭处理
const handleClose = () => {
  visible.value = false;
  emit('close');
};

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.image-set-viewer-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.viewer-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  background: #1a1a1a;
}

.viewer-container.fullscreen {
  height: calc(100vh - 100px);
}

.main-image-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-wrapper {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-image {
  max-width: 100%;
  max-height: 100%;
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

.thumbnail-strip {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: #2a2a2a;
  overflow-x: auto;
}

.thumbnail-item {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.thumbnail-item.active {
  border-color: var(--el-color-primary);
}

.thumbnail-item:hover {
  border-color: var(--el-color-primary-light-3);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
</style>
