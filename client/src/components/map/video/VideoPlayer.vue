<template>
  <el-dialog
    :model-value="visible"
    title="视频播放"
    width="90%"
    class="video-player-modal"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="video-player-container">
      <video
        v-if="video?.videoUrl"
        ref="videoRef"
        :src="video.videoUrl"
        controls
        autoplay
        class="fullscreen-video"
        @error="handleVideoError"
        @loadedmetadata="handleVideoLoaded"
      >
        您的浏览器不支持视频播放
      </video>

      <div v-else class="video-loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>视频加载中...</span>
      </div>
    </div>

    <template #footer>
      <div class="video-controls">
        <div class="video-info">
          <span class="video-title">{{ video?.title }}</span>
          <span v-if="videoDuration" class="video-duration">
            时长: {{ formatDuration(videoDuration) }}
          </span>
        </div>

        <div class="control-buttons">
          <el-button type="primary" @click="toggleFullscreen">
            <el-icon><FullScreen /></el-icon>
            全屏
          </el-button>
          <el-button @click="handleClose">关闭</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading, FullScreen } from '@element-plus/icons-vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  video: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'close']);

const videoRef = ref(null);
const videoDuration = ref(0);

// 格式化时长
const formatDuration = (seconds) => {
  if (!seconds) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

// 处理视频加载完成
const handleVideoLoaded = () => {
  if (videoRef.value) {
    videoDuration.value = videoRef.value.duration;
  }
};

// 处理视频错误
const handleVideoError = (_event) => {
  // 避免在生产环境直接输出 console，使用 Element UI 消息进行用户提示
  ElMessage.error('视频播放失败，请检查文件是否存在');
};

// 切换全屏
const toggleFullscreen = async () => {
  if (!videoRef.value) return;

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await videoRef.value.requestFullscreen();
    }
  } catch (error) {
    ElMessage.error('全屏功能不可用');
  }
};

// 关闭对话框
const handleClose = () => {
  // 暂停视频播放
  if (videoRef.value) {
    videoRef.value.pause();
  }

  // 退出全屏
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  emit('update:visible', false);
  emit('close');
};
</script>

<style lang="scss" scoped>
.video-player-modal {
  :deep(.el-dialog__body) {
    padding: 0;
    height: 70vh;
  }

  :deep(.el-dialog__footer) {
    padding: 15px 20px;
  }
}

.video-player-container {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;

  .fullscreen-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .video-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #fff;

    .loading-icon {
      font-size: 32px;
      animation: spin 1s linear infinite;
    }
  }
}

.video-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .video-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .video-title {
      font-weight: 500;
      color: #333;
    }

    .video-duration {
      font-size: 12px;
      color: #666;
    }
  }

  .control-buttons {
    display: flex;
    gap: 10px;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .video-player-modal {
    :deep(.el-dialog) {
      width: 98% !important;
      margin: 1vh auto;
    }

    :deep(.el-dialog__body) {
      height: 60vh;
    }
  }

  .video-controls {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;

    .control-buttons {
      justify-content: center;
    }
  }
}
</style>
