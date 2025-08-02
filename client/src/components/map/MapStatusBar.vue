<template>
  <div class="status-bar">
    <span>共 {{ totalCount }} 个全景图</span>
    <span v-if="!isOnline" class="offline-indicator">离线模式</span>
  </div>
</template>

<script setup>
defineProps({
  totalCount: {
    type: Number,
    default: 0
  },
  isOnline: {
    type: Boolean,
    default: true
  }
})
</script>

<style lang="scss" scoped>
.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 12px;
  color: #666;
  z-index: 1000;
  
  .offline-indicator {
    color: #e6a23c;
    font-weight: 500;
  }
}
</style>