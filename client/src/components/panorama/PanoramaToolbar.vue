<template>
  <div class="viewer-toolbar">
    <div class="toolbar-left">
      <h1>{{ panorama?.title || '全景图查看器' }}</h1>
      <span v-if="panorama?.description" class="description">
        {{ panorama.description }}
      </span>
    </div>
    <div class="toolbar-right">
      <el-button type="info" size="small" @click="$emit('toggle-auto-rotate')">
        <el-icon><Refresh /></el-icon>
        {{ autoRotating ? '停止旋转' : '自动旋转' }}
      </el-button>
      <el-button type="success" size="small" @click="$emit('toggle-fullscreen')">
        <el-icon><FullScreen /></el-icon>
        全屏
      </el-button>
      <el-button type="warning" size="small" @click="$emit('reset-view')">
        <el-icon><RefreshLeft /></el-icon>
        重置视角
      </el-button>
      <el-button type="primary" size="small" @click="$emit('go-back')">
        <el-icon><Back /></el-icon>
        返回
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Refresh, FullScreen, RefreshLeft, Back } from '@element-plus/icons-vue';

defineProps({
  panorama: {
    type: Object,
    default: null,
  },
  autoRotating: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['toggle-auto-rotate', 'toggle-fullscreen', 'reset-view', 'go-back']);
</script>
