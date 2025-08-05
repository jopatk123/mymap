<template>
  <el-dialog
    :model-value="visible"
    :title="video?.title || '视频点位'"
    width="80%"
    class="video-modal"
    @update:model-value="$emit('update:visible', $event)"
    @close="$emit('close')"
    destroy-on-close
  >
    <div class="video-content">
      <VideoInfo :video="video" />
      <VideoActions
        :video="video"
        :loading="loading"
        @play="$emit('play')"
        @copy-coordinate="$emit('copy-coordinate')"
        @open-new-tab="$emit('open-new-tab')"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import VideoInfo from './VideoInfo.vue'
import VideoActions from './VideoActions.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  video: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'update:visible',
  'close',
  'play',
  'copy-coordinate',
  'open-new-tab'
])
</script>

<style lang="scss" scoped>
.video-modal {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.video-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 768px) {
  .video-modal {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 5vh auto;
    }
  }
}
</style>