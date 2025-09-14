<template>
  <div class="video-actions">
    <div class="action-buttons">
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!video?.videoUrl"
        @click="$emit('play')"
      >
        <el-icon><VideoPlay /></el-icon>
        全屏播放
      </el-button>

      <el-button :disabled="!video?.lat || !video?.lng" @click="$emit('copy-coordinate')">
        <el-icon><CopyDocument /></el-icon>
        复制坐标
      </el-button>
    </div>

    <div v-if="video" class="video-stats">
      <div class="stat-item">
        <span class="stat-label">文件类型：</span>
        <span class="stat-value">{{ video.fileType || 'video/mp4' }}</span>
      </div>

      <div v-if="video.resolution" class="stat-item">
        <span class="stat-label">分辨率：</span>
        <span class="stat-value">{{ video.resolution }}</span>
      </div>

      <div v-if="video.bitrate" class="stat-item">
        <span class="stat-label">码率：</span>
        <span class="stat-value">{{ formatBitrate(video.bitrate) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { VideoPlay, CopyDocument /* Link */ } from '@element-plus/icons-vue';

defineProps({
  video: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['play', 'copy-coordinate']);

// 格式化码率
const formatBitrate = (bitrate) => {
  if (!bitrate) return '未知';

  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  } else if (bitrate >= 1000) {
    return `${(bitrate / 1000).toFixed(1)} Kbps`;
  } else {
    return `${bitrate} bps`;
  }
};
</script>

<style lang="scss" scoped>
.video-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  .el-button {
    flex: 1;
    min-width: 120px;
  }
}

.video-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;

    .stat-label {
      font-size: 12px;
      color: #666;
    }

    .stat-value {
      font-size: 12px;
      color: #333;
      font-weight: 500;
    }
  }
}

@media (max-width: 768px) {
  .action-buttons {
    .el-button {
      flex: 1 1 100%;
      min-width: auto;
    }
  }

  .video-stats {
    .stat-item {
      flex: 1 1 50%;
    }
  }
}
</style>
