<template>
  <el-form-item label="KML文件" prop="file" required>
    <el-upload
      ref="uploadRef"
      class="kml-uploader"
      drag
      :auto-upload="false"
      :show-file-list="false"
      :accept="accept"
      :limit="1"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
    >
      <div v-if="!file" class="upload-placeholder">
        <el-icon class="upload-icon"><Document /></el-icon>
        <div class="upload-text">
          <p>点击或拖拽KML文件到此处</p>
          <p class="upload-hint">支持 .kml 格式，最大 50MB</p>
        </div>
      </div>

      <div v-else class="upload-preview">
        <div class="file-info">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ file.name }}</span>
          <el-button type="danger" :icon="Delete" circle size="small" @click.stop="handleRemove" />
        </div>

        <!-- 验证结果 -->
        <div v-if="validationResult" class="validation-result">
          <div v-if="validationResult.valid" class="validation-success">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>KML文件验证成功，包含 {{ validationResult.placemarkCount }} 个地标</span>
          </div>
          <div v-else class="validation-error">
            <el-icon><CircleCloseFilled /></el-icon>
            <span>验证失败: {{ validationResult.error }}</span>
          </div>
        </div>
      </div>
    </el-upload>
  </el-form-item>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Document, Delete, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: File,
  validationResult: {
    type: Object,
    default: null,
  },
  accept: {
    type: String,
    default: '.kml',
  },
});

const emit = defineEmits([
  'update:modelValue',
  'update:validationResult',
  'file-change',
  'file-remove',
]);

const uploadRef = ref(null);

const file = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  },
});

const validationResult = computed({
  get: () => props.validationResult,
  set: (value) => emit('update:validationResult', value),
});

const handleFileChange = async (file) => {
  const rawFile = file.raw;

  // 验证文件
  const isKml = rawFile.name.toLowerCase().endsWith('.kml');
  const isLt10M = rawFile.size / 1024 / 1024 < 10;

  if (!isKml) {
    ElMessage.error('只能上传KML格式文件!');
    return false;
  }

  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 50MB!');
    return false;
  }

  // 直接调用emit，不通过computed setter
  emit('update:modelValue', rawFile);

  // 发送file-change事件
  emit('file-change', rawFile);

  return true;
};

const handleFileRemove = () => {
  // 同样直接调用emit
  emit('update:modelValue', null);
  emit('update:validationResult', null);
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
.kml-uploader {
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

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  margin-bottom: 12px;
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

.validation-result {
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
}

.validation-success {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #67c23a;
  background-color: #f0f9ff;
  border: 1px solid #b3e19d;
}

.validation-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f56c6c;
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  min-height: 180px;
}
</style>
