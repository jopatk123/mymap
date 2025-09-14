<template>
  <div class="panorama-info">
    <div class="info-item">
      <span class="label">标题：</span>
      <span class="value">{{ panorama?.title || '未命名' }}</span>
    </div>
    <div v-if="panorama?.description" class="info-item">
      <span class="label">描述：</span>
      <span class="value">{{ panorama.description }}</span>
    </div>
    <div class="info-item">
      <span class="label">坐标：</span>
      <span class="value">{{ formatCoordinate(panorama?.lat, panorama?.lng) }}</span>
    </div>
    <div v-if="panorama?.createdAt" class="info-item">
      <span class="label">创建时间：</span>
      <span class="value">{{ formatDate(panorama.createdAt) }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  panorama: {
    type: Object,
    default: null,
  },
});

// 格式化坐标
const formatCoordinate = (lat, lng) => {
  if (lat == null || lng == null) return '未知';
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    return '未知';
  }
  return `${numLat.toFixed(6)}, ${numLng.toFixed(6)}`;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知';
  return new Date(dateString).toLocaleString('zh-CN');
};
</script>

<style lang="scss" scoped>
.panorama-info {
  .info-item {
    display: flex;
    margin-bottom: 12px;

    .label {
      font-weight: 500;
      color: #606266;
      min-width: 80px;
    }

    .value {
      color: #303133;
      flex: 1;
    }
  }
}
</style>
