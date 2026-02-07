<template>
  <BaseUploadDialog
    :model-value="modelValue"
    title="添加图片集"
    title-placeholder="请输入图片集标题"
    description-placeholder="请输入图片集描述"
    :needs-coordinates="true"
    :show-location-btn="false"
    :external-can-submit="canSubmit"
    :skip-file-check="true"
    :show-batch-button="true"
    :submit-handler="handleImageSetUpload"
    @update:model-value="$emit('update:modelValue', $event)"
    @success="handleSuccess"
    @batch-upload="handleOpenBatchUpload"
  >
    <template #file-upload="{ form }">
      <el-form-item label="拍摄坐标" required>
        <div class="coordinate-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>请输入图片集拍摄地点的经纬度坐标</span>
        </div>
      </el-form-item>

      <el-form-item label="图片文件" required>
        <ImageSetUploadArea
          ref="uploadAreaRef"
          v-model:files="form.files"
          :max-count="50"
          @files-change="handleFilesChange"
        />
      </el-form-item>
    </template>
  </BaseUploadDialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';
import BaseUploadDialog from './BaseUploadDialog.vue';
import ImageSetUploadArea from './ImageSetUploadArea.vue';
import { imageSetApi } from '@/api/image-set.js';
import { compressImages, formatFileSize } from '@/utils/image-compressor.js';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue', 'success', 'open-batch-upload']);

const uploadAreaRef = ref(null);
const selectedFiles = ref([]);
const isCompressing = ref(false);

const canSubmit = computed(() => {
  return selectedFiles.value.length > 0 && !isCompressing.value;
});

const handleFilesChange = (files) => {
  selectedFiles.value = files;
};

const handleImageSetUpload = async (form, { setProgress }) => {
  const formData = new FormData();

  // 压缩图片
  isCompressing.value = true;
  setProgress(0);
  
  let compressedFiles;
  try {
    const originalTotalSize = selectedFiles.value.reduce((sum, f) => sum + f.size, 0);
    
    compressedFiles = await compressImages(
      selectedFiles.value,
      { maxSizeKB: 1024, maxWidthOrHeight: 2560 },
      (current, total) => {
        // 压缩阶段占 0-30% 进度
        setProgress(Math.round((current / total) * 30));
      }
    );
    
    const compressedTotalSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (compressedTotalSize < originalTotalSize) {
      ElMessage.success(
        `图片已压缩: ${formatFileSize(originalTotalSize)} → ${formatFileSize(compressedTotalSize)}`
      );
    }
  } catch (error) {
    console.error('图片压缩失败:', error);
    ElMessage.warning('部分图片压缩失败，将使用原图上传');
    compressedFiles = selectedFiles.value;
  } finally {
    isCompressing.value = false;
  }

  // 添加所有图片文件
  compressedFiles.forEach((file) => {
    formData.append('files', file);
  });

  formData.append('title', form.title);
  formData.append('description', form.description || '');
  
  // 处理经纬度：如果都未填写，使用默认值（纬度26，经度119）
  const hasLat = form.lat !== null && form.lat !== undefined && form.lat !== '';
  const hasLng = form.lng !== null && form.lng !== undefined && form.lng !== '';
  
  const finalLat = hasLat ? form.lat : 26;
  const finalLng = hasLng ? form.lng : 119;
  
  formData.append('lat', finalLat);
  formData.append('lng', finalLng);

  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId);
  }

  return await imageSetApi.uploadImageSet(formData, (progressEvent) => {
    if (progressEvent.lengthComputable) {
      // 上传阶段占 30-100% 进度
      const uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      setProgress(30 + Math.round(uploadProgress * 0.7));
    }
  });
};

const handleSuccess = () => {
  // 清空上传区域
  if (uploadAreaRef.value) {
    uploadAreaRef.value.clear();
  }
  selectedFiles.value = [];
  emit('success');
};

// 打开批量上传：关闭当前对话框并通知父层打开批量上传
const handleOpenBatchUpload = () => {
  emit('update:modelValue', false);
  emit('open-batch-upload');
};
</script>

<style scoped>
.coordinate-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: #909399;
  font-size: 12px;

  .el-icon {
    font-size: 14px;
  }
}
</style>
