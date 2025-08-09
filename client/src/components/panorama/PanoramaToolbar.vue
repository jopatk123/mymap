<template>
  <div class="viewer-toolbar">
    <div class="toolbar-left">
      <h1>{{ panorama?.title || '全景图查看器' }}</h1>
      <span v-if="panorama?.description" class="description">
        {{ panorama.description }}
      </span>
    </div>
    <div class="toolbar-right">
      <el-button @click="$emit('toggle-auto-rotate')" type="info" size="small">
        <el-icon><Refresh /></el-icon>
        {{ autoRotating ? '停止旋转' : '自动旋转' }}
      </el-button>
      <el-button @click="$emit('toggle-fullscreen')" type="success" size="small">
        <el-icon><FullScreen /></el-icon>
        全屏
      </el-button>
      <el-button @click="$emit('reset-view')" type="warning" size="small">
        <el-icon><RefreshLeft /></el-icon>
        重置视角
      </el-button>
      <el-button @click="$emit('go-back')" type="primary" size="small">
        <el-icon><Back /></el-icon>
        返回
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Refresh, FullScreen, RefreshLeft, Back } from '@element-plus/icons-vue'

defineProps({
  panorama: {
    type: Object,
    default: null
  },
  autoRotating: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-auto-rotate', 'toggle-fullscreen', 'reset-view', 'go-back'])
</script>