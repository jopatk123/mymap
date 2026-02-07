<template>
  <el-dialog
    v-model="visible"
    title="批量上传图片集"
    width="900px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="batch-upload-body">
      <el-alert title="使用说明" type="info" :closable="false" style="margin-bottom: 16px">
        <p>1. 选择一个包含多个子文件夹的文件夹</p>
        <p>2. 每个子文件夹的名称将作为图片集的标题</p>
        <p>3. 每个子文件夹内的所有图片将作为该图片集的图片文件</p>
        <p>4. 所有图片集将使用默认坐标（纬度 26，经度 119）</p>
      </el-alert>

      <el-form label-width="100px">
        <el-form-item label="批量描述">
          <el-input
            v-model="batchDescription"
            type="textarea"
            :rows="2"
            placeholder="请输入描述，此描述将应用于本次上传的所有图片集"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="目标文件夹">
          <BaseFolderSelect v-model="folderId" :use-global-store="true" />
        </el-form-item>

        <el-form-item label="选择文件夹" required>
          <div class="folder-selector">
            <el-button type="primary" @click="triggerFolderSelect">
              <el-icon style="margin-right: 8px"><FolderOpened /></el-icon>
              选择文件夹
            </el-button>
            <input
              ref="folderInputRef"
              type="file"
              webkitdirectory
              directory
              multiple
              style="display: none"
              @change="handleFolderSelect"
            />
            <span v-if="selectedFolderName" class="selected-folder-name">
              已选择: {{ selectedFolderName }}
            </span>
          </div>
        </el-form-item>
      </el-form>

      <div v-if="imageSets.length > 0" class="image-sets-list">
        <div class="list-header">
          <span>已解析 {{ imageSets.length }} 个图片集（共 {{ totalImageCount }} 张图片）</span>
          <el-button size="small" type="warning" plain @click="clearAll">清空</el-button>
        </div>
        <el-scrollbar height="320px">
          <div v-for="(set, idx) in imageSets" :key="set.id" class="image-set-row">
            <div class="set-info">
              <div class="set-title">{{ set.title }}</div>
              <div class="set-meta">
                <el-tag size="small" type="info">{{ set.images.length }} 张图片</el-tag>
                <el-tag size="small">坐标: 26, 119</el-tag>
              </div>
              <div class="image-previews">
                <img
                  v-for="(img, imgIdx) in set.images.slice(0, 4)"
                  :key="imgIdx"
                  :src="img.previewUrl"
                  class="preview-thumb"
                  :alt="img.file.name"
                />
                <span v-if="set.images.length > 4" class="more-count">
                  +{{ set.images.length - 4 }}
                </span>
              </div>
            </div>
            <div class="actions">
              <el-button :icon="Delete" circle type="danger" size="small" @click="removeSet(idx)" />
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
        <el-button type="primary" :disabled="!canSubmit" :loading="uploading" @click="handleSubmit">
          开始上传 ({{ imageSets.length }} 个图片集)
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { FolderOpened, Delete } from '@element-plus/icons-vue';
import BaseFolderSelect from './BaseFolderSelect.vue';
import BaseProcessingStatus from './BaseProcessingStatus.vue';
import { imageSetApi } from '@/api/image-set.js';
import { compressImages } from '@/utils/image-compressor.js';
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
const folders = computed(() => folderStore.flatFolders || []);
const folderId = ref(null);

const loadFolders = async () => {
  try {
    await folderStore.fetchFolders();
    if (folders.value.length > 0 && folderId.value == null) {
      const defaultFolder = folders.value.find((f) => f.name === '默认文件夹');
      folderId.value = defaultFolder ? defaultFolder.id : folders.value[0].id;
    }
  } catch (e) {
    console.error('加载文件夹失败:', e);
  }
};

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

// 状态
const folderInputRef = ref(null);
const selectedFolderName = ref('');
const imageSets = reactive([]); // { id, title, images: [{ file, previewUrl }] }
const batchDescription = ref('');

const processing = ref(false);
const processingText = ref('');
const uploading = ref(false);
const uploadProgress = ref(0);

const totalImageCount = computed(() => {
  return imageSets.reduce((sum, set) => sum + set.images.length, 0);
});

const canSubmit = computed(() => {
  return imageSets.length > 0 && !processing.value && !uploading.value && folderId.value != null;
});

const triggerFolderSelect = () => {
  folderInputRef.value?.click();
};

const handleFolderSelect = async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  processing.value = true;
  processingText.value = '正在解析文件夹结构...';

  try {
    // 获取文件夹名称
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    selectedFolderName.value = pathParts[0] || '未知文件夹';

    // 按子文件夹分组
    const folderGroups = new Map();

    for (const file of files) {
      // 检查是否是图片文件
      if (!file.type.startsWith('image/')) continue;

      const pathParts = file.webkitRelativePath.split('/');
      
      // 只处理在一级子文件夹中的图片（路径层级 >= 3）
      // 例如: RootFolder/SubFolder/image.jpg
      if (pathParts.length < 3) continue;

      const subFolderName = pathParts[1]; // 一级子文件夹名称

      if (!folderGroups.has(subFolderName)) {
        folderGroups.set(subFolderName, []);
      }
      folderGroups.get(subFolderName).push(file);
    }

    // 清空现有数据
    imageSets.splice(0, imageSets.length);

    // 为每个子文件夹创建图片集
    for (const [folderName, folderFiles] of folderGroups.entries()) {
      const imageSet = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: folderName,
        images: [],
      };

      // 为每个图片创建预览
      for (const file of folderFiles) {
        const previewUrl = await createImagePreview(file);
        imageSet.images.push({
          file,
          previewUrl,
        });
      }

      imageSets.push(imageSet);
    }

    if (imageSets.length === 0) {
      ElMessage.warning('未找到有效的子文件夹或图片文件');
    } else {
      ElMessage.success(`成功解析 ${imageSets.length} 个图片集`);
    }
  } catch (error) {
    console.error('解析文件夹失败:', error);
    ElMessage.error('解析文件夹失败: ' + error.message);
  } finally {
    processing.value = false;
    processingText.value = '';
    // 重置 input，允许重新选择相同文件夹
    event.target.value = '';
  }
};

const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const removeSet = (idx) => {
  imageSets.splice(idx, 1);
  if (imageSets.length === 0) {
    selectedFolderName.value = '';
  }
};

const clearAll = () => {
  imageSets.splice(0, imageSets.length);
  selectedFolderName.value = '';
};

const handleSubmit = async () => {
  if (!canSubmit.value) {
    ElMessage.warning('请先选择包含图片的文件夹');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const total = imageSets.length;
    let completed = 0;

    for (const imageSet of imageSets) {
      processing.value = true;
      processingText.value = `正在处理: ${imageSet.title}...`;

      // 压缩图片
      const filesToCompress = imageSet.images.map((img) => img.file);
      const compressedFiles = await compressImages(
        filesToCompress,
        { maxSizeKB: 1024, maxWidthOrHeight: 2560 },
        () => {} // 跳过单个图片集的进度
      );

      // 构建 FormData
      const formData = new FormData();
      compressedFiles.forEach((file) => {
        formData.append('files', file);
      });

      formData.append('title', imageSet.title);
      formData.append('description', batchDescription.value || '');
      formData.append('lat', '26'); // 默认纬度
      formData.append('lng', '119'); // 默认经度

      if (folderId.value !== undefined && folderId.value !== null) {
        formData.append('folderId', folderId.value);
      }

      // 上传
      await imageSetApi.uploadImageSet(formData);

      completed += 1;
      uploadProgress.value = Math.round((completed * 100) / total);
      processing.value = false;
    }

    // 刷新文件夹计数
    try {
      await folderStore.fetchFolders();
    } catch (e) {
      console.error('刷新文件夹失败:', e);
    }

    ElMessage.success(`批量上传完成，共上传 ${total} 个图片集`);
    emit('success');
    handleClose();
  } catch (error) {
    console.error('批量上传失败:', error);
    ElMessage.error('批量上传失败: ' + error.message);
  } finally {
    uploading.value = false;
    processing.value = false;
    processingText.value = '';
  }
};

const handleClose = () => {
  visible.value = false;
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

.folder-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-folder-name {
  color: #409eff;
  font-weight: 500;
}

.image-sets-list {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background-color: #fafafa;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.image-set-row {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.set-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.set-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.set-meta {
  display: flex;
  gap: 8px;
}

.image-previews {
  display: flex;
  gap: 4px;
  align-items: center;
}

.preview-thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.more-count {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.actions {
  margin-left: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
