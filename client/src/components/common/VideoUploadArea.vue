<template>
  <el-form-item label="视频文件" prop="file" required>
    <el-upload
      ref="uploadRef"
      class="video-uploader"
      drag
      :auto-upload="false"
      :show-file-list="false"
      :accept="accept"
      :limit="1"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
    >
      <div v-if="!file" class="upload-placeholder">
        <el-icon class="upload-icon"><VideoPlay /></el-icon>
        <div class="upload-text">
          <p>点击或拖拽视频文件到此处</p>
          <p class="upload-hint">支持 MP4, WebM, OGG 等格式，最大 500MB</p>
        </div>
      </div>

      <div v-else class="upload-preview">
        <video
          v-if="previewUrl"
          :src="previewUrl"
          class="video-preview"
          controls
          preload="metadata"
        />
        <div class="file-info">
          <el-icon><VideoPlay /></el-icon>
          <span class="file-name">{{ file.name }}</span>
          <el-button type="danger" :icon="Delete" circle size="small" @click.stop="handleRemove" />
        </div>
      </div>
    </el-upload>
  </el-form-item>
</template>

<script setup>
import { ref, computed } from 'vue';
import { VideoPlay, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: File,
  previewUrl: {
    type: String,
    default: '',
  },
  accept: {
    type: String,
    default: 'video/*',
  },
});

const emit = defineEmits(['update:modelValue', 'update:previewUrl', 'file-change', 'file-remove']);

const uploadRef = ref(null);

const file = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const previewUrl = computed({
  get: () => props.previewUrl,
  set: (value) => emit('update:previewUrl', value),
});

const handleFileChange = (file) => {
  // 检查文件对象是否有效
  if (!file || !file.raw) {
    ElMessage.error('文件对象无效!');
    return false;
  }

  const rawFile = file.raw;

  // 检查原始文件对象
  if (!rawFile || !rawFile.type || !rawFile.size) {
    ElMessage.error('文件信息不完整!');
    return false;
  }

  // 验证文件
  const isVideo = rawFile.type.startsWith('video/');
  const isLt500M = rawFile.size / 1024 / 1024 < 500;

  if (!isVideo) {
    ElMessage.error('只能上传视频文件!');
    return false;
  }

  if (!isLt500M) {
    ElMessage.error('视频大小不能超过 500MB!');
    return false;
  }

  // 创建预览URL
  if (rawFile) {
    previewUrl.value = URL.createObjectURL(rawFile);
  }

  file.value = rawFile;
  emit('file-change', file);

  return true;
};

const handleFileRemove = () => {
  file.value = null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
  emit('file-remove');
};

const handleRemove = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
  handleFileRemove();
};

// 清理方法
const clearFiles = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
  handleFileRemove();
};

defineExpose({
  clearFiles,
});
</script>

<style scoped>
.video-uploader {
  width: 100%;
}

.upload-placeholder {
  padding: 40px 0;
  text-align: center;
  color: #909399;
}

.upload-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 8px 0;
  font-size: 14px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.upload-preview {
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fafafa;
}

.video-preview {
  width: 100%;
  max-height: 200px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
}

.file-name {
  flex: 1;
  margin: 0 12px;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  min-height: 180px;
}
</style>
