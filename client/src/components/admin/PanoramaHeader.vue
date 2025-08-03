<template>
  <div class="panorama-header">
    <h2>全景图管理</h2>
    <div class="header-actions">
      <el-button @click="$emit('add-panorama')" type="primary">
        <el-icon><Plus /></el-icon>
        添加全景图
      </el-button>
      <el-button @click="$emit('add-video')" type="success">
        <el-icon><VideoPlay /></el-icon>
        添加视频点位
      </el-button>
      <el-button @click="$emit('add-kml')" type="warning">
        <el-icon><Document /></el-icon>
        添加KML文件
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Plus, VideoPlay, Document } from '@element-plus/icons-vue'

defineEmits(['add-panorama', 'add-video', 'add-kml'])
</script>

<style lang="scss" scoped>
.panorama-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
    color: #303133;
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .panorama-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>