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
    :submit-handler="handleImageSetUpload"
    @update:model-value="$emit('update:modelValue', $event)"
    @success="handleSuccess"
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

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue', 'success']);

const uploadAreaRef = ref(null);
const selectedFiles = ref([]);

const canSubmit = computed(() => {
  return selectedFiles.value.length > 0;
});

const handleFilesChange = (files) => {
  selectedFiles.value = files;
};

const handleImageSetUpload = async (form, { setProgress }) => {
  const formData = new FormData();

  // 添加所有图片文件
  selectedFiles.value.forEach((file) => {
    formData.append('files', file);
  });

  formData.append('title', form.title);
  formData.append('description', form.description || '');
  formData.append('lat', form.lat);
  formData.append('lng', form.lng);

  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId);
  }

  return await imageSetApi.uploadImageSet(formData, (progressEvent) => {
    if (progressEvent.lengthComputable) {
      setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
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
