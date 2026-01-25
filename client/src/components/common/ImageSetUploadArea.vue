<template>
  <div class="image-set-upload-area">
    <el-upload
      ref="uploadRef"
      class="upload-area"
      multiple
      :auto-upload="false"
      :accept="acceptTypes"
      :limit="maxCount"
      :file-list="fileList"
      :on-change="handleChange"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      list-type="picture-card"
    >
      <el-icon class="upload-icon"><Plus /></el-icon>
    </el-upload>

    <div v-if="selectedFiles.length > 0" class="file-summary">
      <span>已选择 {{ selectedFiles.length }} 张图片</span>
      <el-button link type="primary" @click="handleClear">清空</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  files: {
    type: Array,
    default: () => [],
  },
  maxCount: {
    type: Number,
    default: 50,
  },
  maxSize: {
    type: Number,
    default: 50 * 1024 * 1024, // 50MB
  },
});

const emit = defineEmits(['update:files', 'files-change']);

const uploadRef = ref(null);
const fileList = ref([]);

const acceptTypes = 'image/jpeg,image/png,image/gif,image/webp';

const selectedFiles = computed(() => {
  return fileList.value.map((item) => item.raw).filter(Boolean);
});

// 监听fileList变化，同步到父组件
watch(
  selectedFiles,
  (newFiles) => {
    emit('update:files', newFiles);
    emit('files-change', newFiles);
  },
  { deep: true }
);

const validateFile = (file) => {
  // 检查文件类型
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    ElMessage.error(`不支持的文件类型：${file.name}`);
    return false;
  }

  // 检查文件大小
  if (file.size > props.maxSize) {
    const maxSizeMB = (props.maxSize / 1024 / 1024).toFixed(0);
    ElMessage.error(`文件 ${file.name} 超出大小限制（最大 ${maxSizeMB}MB）`);
    return false;
  }

  return true;
};

const handleChange = (file, uploadFileList) => {
  // 验证文件
  if (!validateFile(file.raw)) {
    // 移除无效文件
    const index = uploadFileList.findIndex((f) => f.uid === file.uid);
    if (index > -1) {
      uploadFileList.splice(index, 1);
    }
    return;
  }

  fileList.value = uploadFileList;
};

const handleRemove = (file, uploadFileList) => {
  fileList.value = uploadFileList;
};

const handleExceed = () => {
  ElMessage.warning(`最多只能上传 ${props.maxCount} 张图片`);
};

const handleClear = () => {
  fileList.value = [];
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// 暴露清空方法给父组件
defineExpose({
  clear: handleClear,
  getFiles: () => selectedFiles.value,
});
</script>

<style scoped>
.image-set-upload-area {
  width: 100%;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-list--picture-card) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-area :deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area :deep(.el-upload-list__item) {
  width: 100px;
  height: 100px;
  margin: 0;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
}

.file-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
  color: #606266;
  font-size: 14px;
}
</style>
