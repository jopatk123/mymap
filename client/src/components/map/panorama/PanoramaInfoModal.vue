<template>
  <el-dialog
    :model-value="visible"
    :title="panorama?.title || '全景图'"
    width="80%"
    class="panorama-modal"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @close="$emit('close')"
  >
    <div class="panorama-content">
      <PanoramaInfo :panorama="panorama" />
      <PanoramaActions
        :panorama="panorama"
        :loading="loading"
        @play="$emit('play')"
        @copy-coordinate="$emit('copy-coordinate')"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import PanoramaInfo from './PanoramaInfo.vue';
import PanoramaActions from './PanoramaActions.vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  panorama: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:visible', 'close', 'play', 'copy-coordinate']);
</script>

<style lang="scss" scoped>
.panorama-modal {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.panorama-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 768px) {
  .panorama-modal {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 5vh auto;
    }
  }
}
</style>
