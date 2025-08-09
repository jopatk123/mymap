<template>
  <div class="panorama-actions">
    <el-button 
      @click="$emit('play')" 
      type="primary" 
      :loading="loading"
      :disabled="!panorama?.imageUrl"
    >
      <el-icon><View /></el-icon>
      全屏播放
    </el-button>
    <el-button @click="$emit('copy-coordinate')" type="info">
      <el-icon><CopyDocument /></el-icon>
      复制坐标
    </el-button>
  </div>
</template>

<script setup>
import { View, CopyDocument } from '@element-plus/icons-vue'

defineProps({
  panorama: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['play', 'copy-coordinate'])
</script>

<style lang="scss" scoped>
.panorama-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .panorama-actions {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
}
</style>