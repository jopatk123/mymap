<template>
  <div v-if="images.length > 1" class="thumbnail-strip">
    <div
      v-for="(img, index) in images"
      :key="img.id || index"
      class="thumbnail-item"
      :class="{ active: index === currentIndex }"
      @click="$emit('select', index)"
    >
      <img :src="getThumbnailUrl(img)" :alt="`图片 ${index + 1}`" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  images: {
    type: Array,
    default: () => [],
  },
  currentIndex: {
    type: Number,
    default: 0,
  },
});

defineEmits(['select']);

const getThumbnailUrl = (img) => {
  return img.thumbnail_url || img.thumbnailUrl || img.image_url || img.imageUrl;
};
</script>

<style scoped>
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

/* 移动端适配 */
@media (max-width: 768px) {
  .thumbnail-strip {
    padding: 8px 12px;
    gap: 6px;
  }

  .thumbnail-item {
    width: 50px;
    height: 50px;
  }
}

/* 更小屏幕的额外适配 */
@media (max-width: 480px) {
  .thumbnail-item {
    width: 44px;
    height: 44px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .thumbnail-item:active {
    border-color: var(--el-color-primary);
  }
}
</style>
