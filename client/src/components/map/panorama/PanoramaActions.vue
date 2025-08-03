<template>
  <div class="panorama-actions">
    <el-button @click="$emit('view')" type="primary" :loading="loading">
      <el-icon><View /></el-icon>
      查看全景图
    </el-button>
    <el-button @click="$emit('copy-coordinate')" type="info">
      <el-icon><CopyDocument /></el-icon>
      复制坐标
    </el-button>
    <el-button @click="$emit('open-new-tab')" type="success">
      <el-icon><Link /></el-icon>
      新窗口打开
    </el-button>
    <el-button @click="$emit('delete')" type="danger">
      <el-icon><Delete /></el-icon>
      删除
    </el-button>
  </div>
</template>

<script setup>
import { View, CopyDocument, Link, Delete } from '@element-plus/icons-vue'

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

defineEmits(['view', 'copy-coordinate', 'open-new-tab', 'delete'])
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