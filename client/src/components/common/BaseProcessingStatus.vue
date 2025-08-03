<template>
  <div class="processing-status">
    <!-- 处理中状态 -->
    <div v-if="processing" class="processing-item">
      <el-icon class="processing-icon" :class="{ 'is-rotating': processing }">
        <Loading />
      </el-icon>
      <span class="processing-text">{{ processingText || '处理中...' }}</span>
    </div>
    
    <!-- 上传进度 -->
    <div v-if="uploading" class="upload-progress">
      <div class="progress-info">
        <span>上传进度</span>
        <span class="progress-percentage">{{ uploadProgress }}%</span>
      </div>
      <el-progress
        :percentage="uploadProgress"
        :show-text="false"
        :stroke-width="6"
        :color="progressColor"
      />
    </div>
  </div>
</template>

<script setup>
import { Loading } from '@element-plus/icons-vue'
import { computed } from 'vue'

const props = defineProps({
  processing: {
    type: Boolean,
    default: false
  },
  processingText: {
    type: String,
    default: ''
  },
  uploading: {
    type: Boolean,
    default: false
  },
  uploadProgress: {
    type: Number,
    default: 0
  }
})

// 根据进度改变颜色
const progressColor = computed(() => {
  if (props.uploadProgress < 30) return '#f56c6c'
  if (props.uploadProgress < 70) return '#e6a23c'
  return '#67c23a'
})
</script>

<style scoped>
.processing-status {
  margin: 16px 0;
}

.processing-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 12px;
}

.processing-icon {
  font-size: 16px;
  color: #409eff;
  margin-right: 8px;
}

.is-rotating {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.processing-text {
  color: #606266;
  font-size: 14px;
}

.upload-progress {
  padding: 12px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.progress-percentage {
  font-weight: bold;
  color: #409eff;
}
</style>