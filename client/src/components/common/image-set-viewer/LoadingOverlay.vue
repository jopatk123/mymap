<template>
  <div v-if="loading" class="loading-overlay">
    <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    <span>加载中...</span>
  </div>
</template>

<script setup>
import { Loading } from '@element-plus/icons-vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 26, 0.9);
  color: white;
  z-index: 10;
  gap: 12px;
}

.loading-overlay .is-loading {
  animation: rotating 1.5s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
