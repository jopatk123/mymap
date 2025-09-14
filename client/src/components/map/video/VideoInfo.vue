<template>
  <div class="video-info">
    <div class="video-preview">
      <video
        v-if="video?.videoUrl"
        :src="video.videoUrl"
        controls
        preload="metadata"
        class="video-player"
        @error="handleVideoError"
      >
        您的浏览器不支持视频播放
      </video>
      <div v-else class="video-placeholder">
        <el-icon class="placeholder-icon"><VideoPlay /></el-icon>
        <span>视频加载中...</span>
      </div>
    </div>

    <div class="video-details">
      <div class="detail-row">
        <span class="label">标题：</span>
        <span class="value">{{ video?.title || '未命名视频' }}</span>
      </div>

      <div v-if="video?.description" class="detail-row">
        <span class="label">描述：</span>
        <span class="value">{{ video.description }}</span>
      </div>

      <div v-if="video?.duration" class="detail-row">
        <span class="label">时长：</span>
        <span class="value">{{ formatDuration(video.duration) }}</span>
      </div>

      <div v-if="video?.fileSize" class="detail-row">
        <span class="label">文件大小：</span>
        <span class="value">{{ Formatters.formatFileSize(video.fileSize) }}</span>
      </div>

      <div class="detail-row">
        <span class="label">坐标：</span>
        <span class="value coordinate">
          {{ Formatters.formatCoordinate(video?.lat, video?.lng) }}
        </span>
      </div>

      <div v-if="video?.createdAt" class="detail-row">
        <span class="label">创建时间：</span>
        <span class="value">{{ Formatters.formatDate(video.createdAt) }}</span>
      </div>

      <div v-if="video?.folderName" class="detail-row">
        <span class="label">所属文件夹：</span>
        <span class="value folder-name">{{ video.folderName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import { VideoPlay } from '@element-plus/icons-vue';
import { Formatters } from '@/utils/formatters';

defineProps({
  video: {
    type: Object,
    default: null,
  },
});

// 格式化视频时长
const formatDuration = (seconds) => {
  if (!seconds) return '未知';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

// 处理视频加载错误
const handleVideoError = (event) => {
  console.error('视频加载失败:', event);
  ElMessage.error('视频加载失败，请检查文件是否存在');
};
</script>

<style lang="scss" scoped>
.video-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-preview {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;

  .video-player {
    width: 100%;
    height: auto;
    max-height: 400px;
    object-fit: contain;
  }

  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #999;

    .placeholder-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
  }
}

.video-details {
  .detail-row {
    display: flex;
    margin-bottom: 12px;
    align-items: flex-start;

    .label {
      min-width: 80px;
      font-weight: 500;
      color: #666;
      flex-shrink: 0;
    }

    .value {
      flex: 1;
      color: #333;
      word-break: break-all;

      &.coordinate {
        font-family: 'Courier New', monospace;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }

      &.folder-name {
        color: #409eff;
        font-weight: 500;
      }
    }
  }
}

@media (max-width: 768px) {
  .video-info {
    gap: 15px;
  }

  .video-preview {
    max-height: 250px;
  }

  .video-details {
    .detail-row {
      flex-direction: column;
      gap: 4px;

      .label {
        min-width: auto;
      }
    }
  }
}
</style>
