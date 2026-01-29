<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    :width="dialogWidth"
    destroy-on-close
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入标题" maxlength="100" show-word-limit />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <!-- KML: 作为底图 复选框 -->
      <el-form-item v-if="isKml.value" label="作为底图">
        <!-- Checkbox for marking as basemap removed per UX change -->
      </el-form-item>

      <el-form-item v-if="showCoordinate" label="坐标">
        <div class="coordinate-input">
          <el-input v-model="form.lat" placeholder="纬度" type="number" step="0.000001" />
          <span class="separator">,</span>
          <el-input v-model="form.lng" placeholder="经度" type="number" step="0.000001" />
        </div>
      </el-form-item>

      <!-- 图片集图片管理 -->
      <template v-if="isImageSet">
        <el-divider>图片管理</el-divider>
        <div class="image-set-toolbar">
          <span class="image-count">当前 {{ imageSetImages.length }} 张</span>
          <span class="image-min-tip">至少保留 1 张图片</span>
        </div>

        <div v-loading="imageSetLoading" class="image-grid">
          <div v-for="img in imageSetImages" :key="img.id" class="image-card">
            <img
              :src="getImageThumb(img)"
              :alt="img.file_name || img.fileName || '图片'"
              class="image-thumb"
              @error="handleThumbError"
            />
            <div class="image-actions">
              <el-button
                size="small"
                type="danger"
                :loading="isRemoving(img.id)"
                :disabled="!canRemoveImage || isRemoving(img.id)"
                @click="handleRemoveImage(img)"
              >
                删除
              </el-button>
            </div>
          </div>

          <div v-if="!imageSetLoading && imageSetImages.length === 0" class="image-empty">
            暂无图片，请先添加图片
          </div>
        </div>

        <el-form-item label="新增图片">
          <ImageSetUploadArea
            ref="uploadAreaRef"
            v-model:files="newImages"
            :max-count="50"
          />
          <div class="upload-actions">
            <el-button
              type="primary"
              :loading="addUploading || isCompressing"
              :disabled="newImages.length === 0 || addUploading || isCompressing"
              @click="handleAddImages"
            >
              上传新增
            </el-button>
            <span v-if="uploadProgress > 0" class="upload-progress">
              上传进度 {{ uploadProgress }}%
            </span>
            <span v-if="newImages.length > 0" class="upload-summary">
              已选择 {{ newImages.length }} 张，约 {{ selectedFilesSize }}
            </span>
          </div>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 保存 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { updatePanorama, getPanoramaById } from '@/api/panorama.js';
import { videoApi } from '@/api/video.js';
import { kmlApi } from '@/api/kml.js';
import { imageSetApi } from '@/api/image-set.js';
import ImageSetUploadArea from '@/components/common/ImageSetUploadArea.vue';
import { compressImages, formatFileSize } from '@/utils/image-compressor.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  file: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 表单引用
const formRef = ref(null);

// 表单数据
const form = reactive({
  title: '',
  description: '',
  lat: '',
  lng: '',
});

// 表单验证规则（根据文件类型动态变化）
const rules = computed(() => {
  const base = {
    title: [
      { required: true, message: '请输入标题', trigger: 'blur' },
      { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' },
    ],
  };
  if (showCoordinate.value) {
    base.lat = [
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
    ];
    base.lng = [
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
    ];
  }
  return base;
});

// 状态
const submitting = ref(false);

// 计算类型与标题
const fileType = computed(() => props.file?.fileType || props.file?.type || '');
const isPanorama = computed(() => fileType.value === 'panorama');
const isVideo = computed(() => fileType.value === 'video');
const isKml = computed(() => fileType.value === 'kml');
const isImageSet = computed(() => fileType.value === 'image-set');
const showCoordinate = computed(() => isPanorama.value || isVideo.value || isImageSet.value);
const dialogTitle = computed(() => {
  if (isPanorama.value) return '编辑全景图';
  if (isVideo.value) return '编辑视频点位';
  if (isKml.value) return '编辑KML文件';
  if (isImageSet.value) return '编辑图片集';
  return '编辑文件';
});
const dialogWidth = computed(() => (isImageSet.value ? '860px' : '600px'));

// 图片集图片管理状态
const imageSetImages = ref([]);
const imageSetLoading = ref(false);
const newImages = ref([]);
const uploadAreaRef = ref(null);
const addUploading = ref(false);
const isCompressing = ref(false);
const uploadProgress = ref(0);
const removingImageIds = ref([]);
const canRemoveImage = computed(() => imageSetImages.value.length > 1);
const selectedFilesSize = computed(() => {
  if (!newImages.value || newImages.value.length === 0) return '0 B';
  const total = newImages.value.reduce((sum, file) => sum + (file?.size || 0), 0);
  return formatFileSize(total);
});

// 同步文件到表单
watch(
  () => props.file,
  (newFile) => {
    if (newFile) {
      form.title = newFile.title || '';
      form.description = newFile.description || '';
      const lat = newFile.lat ?? newFile.latitude;
      const lng = newFile.lng ?? newFile.longitude;
      form.lat = lat != null ? String(lat) : '';
      form.lng = lng != null ? String(lng) : '';
    }
  },
  { immediate: true }
);

watch(
  () => [visible.value, isImageSet.value, props.file?.id],
  async ([isVisible, isImgSet, id]) => {
    if (!isVisible || !isImgSet || !id) return;
    await loadImageSetDetail(id);
  }
);

const loadImageSetDetail = async (id) => {
  imageSetLoading.value = true;
  try {
    const data = await imageSetApi.getImageSet(id);
    imageSetImages.value = Array.isArray(data?.images) ? data.images : [];
  } catch (error) {
    ElMessage.error('加载图片集详情失败');
    imageSetImages.value = [];
  } finally {
    imageSetLoading.value = false;
  }
};

const getImageThumb = (img) => {
  return (
    img?.thumbnail_url ||
    img?.thumbnailUrl ||
    img?.image_url ||
    img?.imageUrl ||
    '/default-file.jpg'
  );
};

const handleThumbError = (event) => {
  event.target.src = '/default-file.jpg';
};

const isRemoving = (id) => removingImageIds.value.includes(id);

const handleRemoveImage = async (img) => {
  if (!props.file?.id || !img?.id) return;
  if (!canRemoveImage.value) {
    ElMessage.warning('至少保留 1 张图片');
    return;
  }

  try {
    await ElMessageBox.confirm('确定要删除这张图片吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    removingImageIds.value.push(img.id);
    const data = await imageSetApi.removeImage(props.file.id, img.id);
    imageSetImages.value = Array.isArray(data?.images) ? data.images : [];
    emit('success');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除图片失败: ' + (error?.message || error));
    }
  } finally {
    removingImageIds.value = removingImageIds.value.filter((item) => item !== img.id);
  }
};

const handleAddImages = async () => {
  if (!props.file?.id) return;
  if (!newImages.value || newImages.value.length === 0) {
    ElMessage.warning('请先选择图片');
    return;
  }

  addUploading.value = true;
  uploadProgress.value = 0;

  try {
    isCompressing.value = true;
    const compressedFiles = await compressImages(newImages.value);
    isCompressing.value = false;

    const formData = new FormData();
    compressedFiles.forEach((file) => {
      formData.append('files', file);
    });

    const data = await imageSetApi.addImages(
      props.file.id,
      formData,
      (progressEvent) => {
        if (!progressEvent?.total) return;
        uploadProgress.value = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      }
    );

    imageSetImages.value = Array.isArray(data?.images) ? data.images : imageSetImages.value;
    if (uploadAreaRef.value) uploadAreaRef.value.clear();
    newImages.value = [];
    uploadProgress.value = 0;
    emit('success');
    ElMessage.success('图片添加成功');
  } catch (error) {
    ElMessage.error('图片添加失败: ' + (error?.message || error));
  } finally {
    addUploading.value = false;
    isCompressing.value = false;
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value || !props.file?.id) return;

  try {
    // 表单验证
    await formRef.value.validate();

    submitting.value = true;

    // 根据文件类型调用对应更新API
    if (isPanorama.value) {
      const origin = window.location?.origin || '';
      const makeAbsolute = (url) => {
        if (!url) return undefined;
        return url.startsWith('http://') || url.startsWith('https://')
          ? url
          : origin
          ? origin + url
          : undefined;
      };
      const payload = {
        title: form.title,
        description: form.description,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        imageUrl: makeAbsolute(props.file.imageUrl),
        thumbnailUrl: makeAbsolute(props.file.thumbnailUrl),
      };
      // 传递当前 folderId，避免后端可能的空值覆盖
      const currentFolderId = props.file.folder_id ?? props.file.folderId;
      if (currentFolderId !== undefined) {
        payload.folderId = currentFolderId;
      }
      // 前端调试日志已删除以避免泄露和噪音
      await updatePanorama(props.file.id, payload);
      try {
        await getPanoramaById(props.file.id);
      } catch (_) {}
    } else if (isVideo.value) {
      await videoApi.updateVideoPoint(props.file.id, {
        title: form.title,
        description: form.description,
        latitude: parseFloat(form.lat),
        longitude: parseFloat(form.lng),
      });
    } else if (isKml.value) {
      const payload = {
        title: form.title,
        description: form.description,
      };
      if (form.isBasemap) payload.isBasemap = true;
      else payload.isBasemap = false;
      await kmlApi.updateKmlFile(props.file.id, payload);
    } else if (isImageSet.value) {
      await imageSetApi.updateImageSet(props.file.id, {
        title: form.title,
        description: form.description,
        latitude: parseFloat(form.lat),
        longitude: parseFloat(form.lng),
      });
    } else {
      throw new Error('未知文件类型，无法更新');
    }

    ElMessage.success('更新成功');
    emit('success');
    handleClose();
  } catch (error) {
    ElMessage.error('更新失败: ' + error.message);
  } finally {
    submitting.value = false;
  }
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  resetForm();
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }

  form.title = '';
  form.description = '';
  form.lat = '';
  form.lng = '';

  imageSetImages.value = [];
  newImages.value = [];
  uploadProgress.value = 0;
  addUploading.value = false;
  isCompressing.value = false;
  removingImageIds.value = [];
  if (uploadAreaRef.value) {
    uploadAreaRef.value.clear();
  }
};
</script>

<style lang="scss" scoped>
.coordinate-input {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-input {
    flex: 1;
  }

  .separator {
    color: #909399;
    font-weight: 500;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.image-set-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.image-min-tip {
  color: #909399;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.image-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
}

.image-thumb {
  width: 100%;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f7fa;
}

.image-actions {
  display: flex;
  justify-content: center;
}

.image-empty {
  color: #909399;
  font-size: 13px;
  padding: 12px 0;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.upload-progress {
  color: #409eff;
  font-size: 12px;
}

.upload-summary {
  color: #606266;
  font-size: 12px;
}

@media (max-width: 768px) {
  .coordinate-input {
    flex-direction: column;
    align-items: stretch;

    .separator {
      display: none;
    }
  }
}
</style>
