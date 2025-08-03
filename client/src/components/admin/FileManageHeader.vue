<template>
  <div class="page-header">
    <h2>文件管理</h2>
    <div class="header-actions">
      <el-button @click="$emit('upload-request', 'panorama')" type="primary">
        <el-icon><Plus /></el-icon>
        添加全景图
      </el-button>
      <el-button @click="$emit('upload-request', 'video')" type="success">
        <el-icon><VideoPlay /></el-icon>
        添加视频点位
      </el-button>
      <el-button @click="$emit('upload-request', 'kml')" type="warning">
        <el-icon><Document /></el-icon>
        添加KML文件
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Plus, VideoPlay, Document } from '@element-plus/icons-vue'

defineEmits(['upload-request'])
</script>

<style lang="scss" scoped>
.page-header {
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
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>