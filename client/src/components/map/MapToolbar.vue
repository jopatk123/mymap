<template>
  <div class="toolbar">
    <el-button-group>
      <el-button 
        @click="$emit('toggle-panorama-list')" 
        type="primary"
        :icon="panoramaListVisible ? Hide : View"
        :title="panoramaListVisible ? '隐藏全景图列表' : '显示全景图列表'"
      >
        {{ panoramaListVisible ? '隐藏列表' : '显示列表' }}
      </el-button>
      <el-button @click="$emit('show-upload')" type="success">
        <el-icon><Plus /></el-icon>
        添加
      </el-button>
      <el-button @click="$emit('show-settings')" type="info">
        <el-icon><Setting /></el-icon>
        设置
      </el-button>
      <el-button @click="$emit('show-kml-settings')" type="warning">
        <el-icon><Tools /></el-icon>
        KML设置
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup>
import { Plus, Setting, View, Hide, Tools } from '@element-plus/icons-vue'

defineProps({
  panoramaListVisible: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'toggle-panorama-list',
  'show-upload',
  'show-settings',
  'show-kml-settings'
])
</script>

<style lang="scss" scoped>
.toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

// 移动端适配
@media (max-width: 768px) {
  .toolbar {
    top: 10px;
    right: 10px;
    
    .el-button-group {
      flex-direction: column;
      
      .el-button {
        margin: 0 0 4px 0;
      }
    }
  }
}
</style>