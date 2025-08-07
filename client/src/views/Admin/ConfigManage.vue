<template>
  <div class="config-manage-page">
    <div class="page-header">
      <h2>系统配置管理</h2>
      <p>管理系统的各项配置参数</p>
    </div>
    
    <div class="page-content">
      <ConfigManager />
    </div>
  </div>
</template>

<script setup>
import ConfigManager from '@/components/admin/ConfigManager.vue'
</script>

<style lang="scss" scoped>
.config-manage-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .page-header {
    padding: 24px;
    background: white;
    border-bottom: 1px solid #e6e6e6;
    
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
    
    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }
  
  .page-content {
    flex: 1;
    overflow: auto;
  }
}
</style>