<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
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
        <el-checkbox v-model="form.isBasemap">将此 KML 标记为底图（点位默认不显示）</el-checkbox>
      </el-form-item>

      <el-form-item v-if="showCoordinate" label="坐标">
        <div class="coordinate-input">
          <el-input v-model="form.lat" placeholder="纬度" type="number" step="0.000001" />
          <span class="separator">,</span>
          <el-input v-model="form.lng" placeholder="经度" type="number" step="0.000001" />
        </div>
      </el-form-item>
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
import { ElMessage } from 'element-plus';
import { updatePanorama, getPanoramaById } from '@/api/panorama.js';
import { videoApi } from '@/api/video.js';
import { kmlApi } from '@/api/kml.js';

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
const showCoordinate = computed(() => isPanorama.value || isVideo.value);
const dialogTitle = computed(() => {
  if (isPanorama.value) return '编辑全景图';
  if (isVideo.value) return '编辑视频点位';
  if (isKml.value) return '编辑KML文件';
  return '编辑文件';
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
