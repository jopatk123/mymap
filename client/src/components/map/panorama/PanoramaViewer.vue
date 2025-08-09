<template>
  <el-dialog
    :model-value="visible"
    title="全景图查看"
    width="90%"
    class="panorama-viewer-modal"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
    destroy-on-close
    append-to-body
  >
    <div
      class="viewer-container"
      v-loading="loading"
      element-loading-text="全景图加载中..."
      element-loading-background="rgba(0, 0, 0, 0.7)"
    >
      <div id="panorama-viewer" class="panorama-viewer"></div>
    </div>
    
    <template #footer>
      <PanoramaViewerControls
        :auto-rotating="autoRotating"
        @toggle-auto-rotate="$emit('toggle-auto-rotate')"
        @toggle-fullscreen="$emit('toggle-fullscreen')"
        @reset-view="$emit('reset-view')"
        @close="handleClose"
      />
    </template>
  </el-dialog>
</template>

<script setup>
import PanoramaViewerControls from './PanoramaViewerControls.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  autoRotating: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:visible',
  'close',
  'toggle-auto-rotate',
  'toggle-fullscreen',
  'reset-view'
])

const handleClose = () => {
  emit('close')
}
</script>

<style lang="scss" scoped>
.panorama-viewer-modal {
  :deep(.el-dialog__body) {
    padding: 0;
    height: 70vh;
  }
  
  .viewer-container {
    position: relative;
    width: 100%;
    height: 100%;
    
    .panorama-viewer {
      width: 100%;
      height: 100%;
      background: #000;
    }
  }
}

@media (max-width: 768px) {
  .panorama-viewer-modal {
    :deep(.el-dialog) {
      width: 98% !important;
      margin: 1vh auto;
    }
    
    :deep(.el-dialog__body) {
      height: 60vh;
    }
  }
}
</style>