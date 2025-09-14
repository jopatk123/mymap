<template>
  <div v-if="panorama" class="viewer-footer">
    <div class="footer-info">
      <div class="info-item">
        <el-icon><Location /></el-icon>
        <span>{{ formatCoordinate(panorama.lat, panorama.lng) }}</span>
      </div>
      <div v-if="panorama.createdAt" class="info-item">
        <el-icon><Calendar /></el-icon>
        <span>{{ formatDate(panorama.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Location, Calendar } from '@element-plus/icons-vue';

defineProps({
  panorama: {
    type: Object,
    default: null,
  },
});

// 格式化坐标
const formatCoordinate = (lat, lng) => {
  if (!lat || !lng) return '未知';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知';
  return new Date(dateString).toLocaleString('zh-CN');
};
</script>
