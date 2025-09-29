<template>
  <el-dialog
    v-model="visible"
    title="批量上传全景图"
    width="800px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="batch-upload-body">
      <el-form label-width="100px">
        <el-form-item label="批量描述">
          <el-input
            v-model="batchDescription"
            type="textarea"
            :rows="2"
            placeholder="请输入描述，此描述将应用于本次选择的所有全景图"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="目标文件夹">
          <BaseFolderSelect v-model="folderId" :use-global-store="true" />
        </el-form-item>

        <el-form-item label="选择文件" required>
          <el-upload
            ref="uploadRef"
            class="panorama-batch-uploader"
            drag
            :auto-upload="false"
            :show-file-list="false"
            :multiple="true"
            accept="image/*"
            :on-change="onElUploadChange"
          >
            <div class="upload-placeholder">
              <el-icon class="upload-icon"><Picture /></el-icon>
              <div class="upload-text">
                <p>点击或拖拽全景图片到此处（可多选）</p>
                <p class="upload-hint">支持 JPG、PNG、WebP 等格式，单文件最大 50MB</p>
              </div>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>

      <div v-if="items.length" class="file-list">
        <div class="list-header">
          <span>已选择 {{ items.length }} 个文件</span>
          <el-button size="small" type="warning" plain @click="clearAll">清空</el-button>
        </div>
        <el-scrollbar height="260px">
          <div v-for="(item, idx) in items" :key="item.id" class="file-row">
            <img v-if="item.previewUrl" :src="item.previewUrl" class="thumb" alt="预览" />
            <div class="meta">
              <div class="name">{{ item.file.name }}</div>
              <div class="sub">
                <el-tag size="small" type="info">标题: {{ item.title }}</el-tag>
                <el-tag v-if="item.lat != null && item.lng != null" size="small" type="success">
                  坐标: {{ item.lat }}, {{ item.lng }}
                </el-tag>
                <el-tag v-else size="small" type="danger">缺少GPS坐标</el-tag>
              </div>
            </div>
            <div class="actions">
              <el-button :icon="Delete" circle type="danger" @click="removeAt(idx)" />
            </div>
          </div>
        </el-scrollbar>
      </div>

      <BaseProcessingStatus
        v-if="processing || uploading"
        :processing="processing"
        :processing-text="processingText"
        :uploading="uploading"
        :upload-progress="uploadProgress"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :disabled="!canSubmit" :loading="uploading" @click="handleSubmit"
          >开始上传</el-button
        >
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { Picture, Delete } from '@element-plus/icons-vue';
import BaseFolderSelect from './BaseFolderSelect.vue';
import BaseProcessingStatus from './BaseProcessingStatus.vue';
import { ImageProcessor } from '@/services/image-processor.js';
import { uploadPanoramaImage } from '@/api/panorama.js';
import { ElMessage } from 'element-plus';
import { useFolderStore } from '@/store/folder.js';

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

// 使用全局 store
const folderStore = useFolderStore();

// folders - 直接使用 store 中的响应式数据
const folders = computed(() => folderStore.flatFolders || []);
const folderId = ref(null);

const loadFolders = async () => {
  try {
    // 使用全局 store 获取文件夹数据
    await folderStore.fetchFolders();

    if (folders.value.length > 0 && folderId.value == null) {
      const defaultFolder = folders.value.find((f) => f.name === '默认文件夹');
      folderId.value = defaultFolder ? defaultFolder.id : folders.value[0].id;
    }
  } catch (e) {
    console.error('加载文件夹失败:', e);
  }
};

// 监听文件夹数据变化，自动设置默认文件夹
watch(
  folders,
  (newFolders) => {
    if (newFolders.length > 0 && folderId.value == null) {
      const defaultFolder = newFolders.find((f) => f.name === '默认文件夹');
      folderId.value = defaultFolder ? defaultFolder.id : newFolders[0].id;
    }
  },
  { immediate: true }
);

// state
const items = reactive([]); // {id, file, title, lat, lng, previewUrl}
const batchDescription = ref('');

const processing = ref(false);
const processingText = ref('');
const uploading = ref(false);
const uploadProgress = ref(0);

const onElUploadChange = async (uploadFile, _uploadFiles) => {
  if (!uploadFile?.raw) return;
  await addFiles([uploadFile.raw]);
};

const addFiles = async (fileList) => {
  for (const raw of fileList) {
    const processor = new ImageProcessor();
    try {
      processing.value = true;
      processingText.value = '正在处理文件...';
      const result = await processor.processFile(raw);
      items.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: result.file,
        title: result.title || raw.name.replace(/\.[^/.]+$/, ''),
        lat: result.gpsData?.lat ?? null,
        lng: result.gpsData?.lng ?? null,
        previewUrl: result.previewUrl || '',
      });
    } catch (e) {
      ElMessage.error(e?.message || '处理文件失败');
    } finally {
      processing.value = false;
      processingText.value = '';
    }
  }
};

const removeAt = (idx) => {
  items.splice(idx, 1);
};

const clearAll = () => {
  items.splice(0, items.length);
};

const allItemsValid = computed(() => {
  if (!items.length) return false;
  return items.every((it) => {
    const hasBasics = it.file && it.title && it.lat != null && it.lng != null;
    if (!hasBasics) return false;
    const lat = parseFloat(it.lat);
    const lng = parseFloat(it.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });
});

const canSubmit = computed(() => {
  return allItemsValid.value && !processing.value && !uploading.value && folderId.value != null;
});

const handleSubmit = async () => {
  if (!canSubmit.value) {
    ElMessage.warning('请先选择文件并确保所有文件均包含GPS坐标');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;
  try {
    // 压缩并逐个上传
    const total = items.length;
    let completed = 0;

    // 使用已导入的压缩器
    const singleton = new ImageProcessor();

    for (const it of items) {
      processing.value = true;
      processingText.value = '正在处理图片...';
      const compressionResult = await singleton.compressImageIfNeeded(it.file);
      const fileToUpload = compressionResult.file;

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', it.title);
      formData.append('description', batchDescription.value || '');
      formData.append('lat', it.lat);
      formData.append('lng', it.lng);
      if (folderId.value !== undefined && folderId.value !== null) {
        formData.append('folderId', folderId.value);
      }

      await uploadPanoramaImage(formData);
      completed += 1;
      uploadProgress.value = Math.round((completed * 100) / total);
    }

    // 刷新文件夹计数
    try {
      const { useFolderStore } = await import('@/store/folder.js');
      const folderStore = useFolderStore();
      await folderStore.fetchFolders();
    } catch (e) {}

    ElMessage.success('批量上传完成');
    emit('success');
    handleClose();
  } catch (e) {
    ElMessage.error(e?.message || '上传失败');
  } finally {
    uploading.value = false;
    processing.value = false;
    processingText.value = '';
  }
};

const handleClose = () => {
  visible.value = false;
  // reset
  batchDescription.value = '';
  clearAll();
};

onMounted(() => {
  loadFolders();
});
</script>

<style scoped>
.batch-upload-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panorama-batch-uploader {
  width: 100%;
}
.upload-placeholder {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}
.upload-icon {
  font-size: 32px;
}
.upload-text {
  display: flex;
  flex-direction: column;
}
.upload-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.file-list {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 8px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  border-bottom: 1px dashed var(--el-border-color-light);
}
.file-row:last-child {
  border-bottom: none;
}
.thumb {
  width: 64px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  background: #f5f5f5;
}
.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.name {
  font-weight: 500;
}
.sub {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.actions {
  display: flex;
  gap: 8px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
