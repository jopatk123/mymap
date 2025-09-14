<template>
  <div class="viewer-controls">
    <el-button type="info" @click="$emit('toggle-auto-rotate')">
      <el-icon><Refresh /></el-icon>
      {{ autoRotating ? '停止旋转' : '自动旋转' }}
    </el-button>
    <el-button type="success" @click="$emit('toggle-fullscreen')">
      <el-icon><FullScreen /></el-icon>
      全屏
    </el-button>
    <el-button type="warning" @click="$emit('reset-view')">
      <el-icon><RefreshLeft /></el-icon>
      重置视角
    </el-button>
    <el-button @click="$emit('close')">关闭</el-button>
  </div>
</template>

<script setup>
import { Refresh, FullScreen, RefreshLeft } from '@element-plus/icons-vue';

defineProps({
  autoRotating: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['toggle-auto-rotate', 'toggle-fullscreen', 'reset-view', 'close']);
</script>

<style lang="scss" scoped>
.viewer-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .viewer-controls {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }
}
</style>
