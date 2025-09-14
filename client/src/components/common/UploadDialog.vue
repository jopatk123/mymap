<template>
  <BaseUploadDialog
    :model-value="modelValue"
    title="上传全景图"
    title-placeholder="请输入全景图标题"
    description-placeholder="请输入全景图描述"
    :needs-coordinates="true"
    :show-location-btn="false"
    :additional-rules="panoramaRules"
    :submit-handler="handlePanoramaUpload"
    :show-batch-button="true"
    @update:model-value="$emit('update:modelValue', $event)"
    @batch-upload="handleOpenBatchUpload"
    @success="$emit('success')"
  >
    <template #file-upload="{ form, uploadRef }">
      <PanoramaUploadArea
        :ref="uploadRef"
        v-model:file="form.file"
        v-model:preview-url="previewUrl"
        v-model:gps-info="gpsInfo"
        @file-change="(file) => handleFileChange(file, form)"
        @file-remove="handleFileRemove"
      />
    </template>
  </BaseUploadDialog>
</template>

<script setup>
import { ref } from 'vue';
import BaseUploadDialog from './BaseUploadDialog.vue';
import PanoramaUploadArea from './PanoramaUploadArea.vue';
import { usePanoramaProcessor } from '@/composables/use-file-processor';
import { uploadPanoramaImage } from '@/api/panorama.js';
// usePanoramaStore removed: not referenced in this component
// 按需加载 image-processor，避免和动态导入混用阻止分包
let imageProcessor;

defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue', 'success', 'open-batch-upload']);

const { previewUrl, processFile, validateFile, cleanup } = usePanoramaProcessor();
const gpsInfo = ref(null);
// panoramaStore intentionally not referenced here; keep import for side-effects if needed

// 全景图特有的验证规则
const panoramaRules = {
  lat: [
    { required: true, message: '请输入纬度', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const lat = parseFloat(value);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          callback(new Error('纬度必须在 -90 到 90 之间'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  lng: [
    { required: true, message: '请输入经度', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const lng = parseFloat(value);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          callback(new Error('经度必须在 -180 到 180 之间'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const handleFileChange = async (file, form) => {
  // 检查文件对象是否有效
  if (!file || typeof file !== 'object') {
    // 文件对象无效，记录为警告以便开发时查看
    void console.warn('UploadDialog: 文件对象无效!');
    return;
  }

  if (validateFile(file)) {
    try {
      await processFile(file, form);
    } catch (error) {
      void console.warn('处理文件时出错:');
      // 即使处理出错，也要确保文件被设置到表单中，让用户可以继续上传
      if (!form.file) {
        form.file = file;
        // 自动设置标题（如果表单中没有标题）
        if (!form.title && file.name) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          form.title = nameWithoutExt;
        }
      }
    }
  } else {
    // 验证失败：在 UI 上显示错误，无需控制台打印
  }
};

const handleFileRemove = () => {
  cleanup();
  gpsInfo.value = null;
};

// 打开批量上传：关闭当前对话框并通知父层打开批量上传
const handleOpenBatchUpload = () => {
  emit('update:modelValue', false);
  emit('open-batch-upload');
};

const handlePanoramaUpload = async (form, { setProgress, setProcessing }) => {
  // 检查图片尺寸并压缩
  setProcessing(true, '正在处理图片...');

  if (!imageProcessor) {
    const mod = await import('@/services/image-processor.js');
    imageProcessor = mod.imageProcessor;
  }
  const compressionResult = await imageProcessor.compressImageIfNeeded(form.file);
  let fileToUpload = compressionResult.file;

  if (compressionResult.compressed) {
    setProcessing(true, '正在压缩图片...');
    setProcessing(
      true,
      `图片已压缩：${compressionResult.originalDimensions.width}x${compressionResult.originalDimensions.height} → ${compressionResult.newDimensions.width}x${compressionResult.newDimensions.height}`
    );
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('title', form.title);
  formData.append('description', form.description);
  formData.append('lat', form.lat);
  formData.append('lng', form.lng);
  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId);
  }

  // 上传文件
  const newPanorama = await uploadPanoramaImage(formData, (progress) => {
    setProgress(progress);
  });

  // 上传成功后由页面统一处理数据刷新

  // 重新加载文件夹数据以更新点位数量
  try {
    const { useFolderStore } = await import('@/store/folder.js');
    const folderStore = useFolderStore();
    await folderStore.fetchFolders();
  } catch (error) {
    void console.warn('重新加载文件夹数据失败:', error);
  }

  return newPanorama;
};
</script>
