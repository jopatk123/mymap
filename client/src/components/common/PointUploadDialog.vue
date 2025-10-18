<template>
  <BaseUploadDialog
    :model-value="modelValue"
    title="添加图层点位"
    title-placeholder="请输入点位标题"
    description-placeholder="请输入点位描述"
    :submit-handler="handlePointUpload"
    :external-can-submit="canSubmit"
    @update:model-value="$emit('update:modelValue', $event)"
    @success="$emit('success')"
  >
    <template #file-upload="{ form, uploadRef }">
      <!-- 坐标系说明 -->
      <el-form-item label="坐标系说明">
        <div class="coordinate-info">
          <el-icon><InfoFilled /></el-icon>
          <span
            >KML文件使用WGS-84坐标系，Excel文件中的经纬度也应使用WGS-84坐标系，系统将自动转换为适合地图显示的坐标</span
          >
        </div>
      </el-form-item>

      <!-- 点位文件上传区域 -->
      <PointUploadArea
        :ref="uploadRef"
        v-model="form.file"
        v-model:validation-result="validationResult"
        @file-change="(file) => handleFileChange(file, form)"
        @file-remove="handleFileRemove"
      />

      <!-- 作为底图选项（仅KML文件显示） -->
      <el-form-item v-if="form && isKmlFile" label="作为底图">
        <el-switch v-model="form.isBasemap" active-text="是" inactive-text="否" />
        <div v-if="form.isBasemap" class="basemap-hint">
          <el-icon><InfoFilled /></el-icon>
          <span>底图文件将在地图底层显示，通常用于参考线路或区域边界</span>
        </div>
      </el-form-item>
    </template>
  </BaseUploadDialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';
import BaseUploadDialog from './BaseUploadDialog.vue';
import PointUploadArea from './PointUploadArea.vue';
import { kmlApi } from '@/api/kml.js';

defineProps({
  modelValue: Boolean,
});

defineEmits(['update:modelValue', 'success']);

const validationResult = ref(null);

// 检查是否为KML文件
const isKmlFile = computed(() => {
  if (!validationResult.value) return false;
  // 如果验证结果包含placemarks则为KML，包含points则为Excel
  return 'placemarks' in validationResult.value;
});

// 检查是否可以提交
const canSubmit = computed(() => {
  return validationResult.value?.valid === true;
});

const handleFileChange = async (file, form) => {
  // 设置文件到表单
  if (form) {
    form.file = file;
    // 若标题为空，则自动使用文件名（去除扩展名）作为标题
    if (!form.title && file && file.name) {
      const baseName = file.name.replace(/\.[^.]+$/, '');
      form.title = baseName;
    }
    // 重置底图选项
    form.isBasemap = false;
  }
};

const handleFileRemove = () => {
  validationResult.value = null;
};

const handlePointUpload = async (form, { setProgress, setProcessing }) => {
  if (!validationResult.value?.valid) {
    throw new Error('请先上传有效的点位文件');
  }

  if (!form.file) {
    throw new Error('请选择文件');
  }

  setProcessing(true, '正在处理点位文件...');

  try {
    // 判断文件类型并相应处理
    if (isKmlFile.value) {
      // KML文件处理
      return await handleKmlUpload(form, { setProgress, setProcessing });
    } else {
      // Excel文件处理
      return await handleExcelUpload(form, { setProgress, setProcessing });
    }
  } catch (error) {
    setProcessing(false);
    throw error;
  }
};

// 处理KML文件上传
const handleKmlUpload = async (form, { setProgress }) => {
  const formData = new FormData();
  formData.append('file', form.file);
  formData.append('title', form.title);
  formData.append('description', form.description);
  if (form.isBasemap) {
    formData.append('isBasemap', '1');
  }
  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId);
  }

  const res = await kmlApi.uploadKmlFile(formData, (progressEvent) => {
    if (progressEvent.lengthComputable) {
      setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
    }
  });

  if (!res.success) {
    throw new Error(res.message || '上传失败');
  }

  return res;
};

// 处理Excel文件上传
const handleExcelUpload = async (form, { setProgress }) => {
  // 构建点位数据
  const points = validationResult.value.points || [];

  if (points.length === 0) {
    throw new Error('没有找到有效的点位数据');
  }

  // 创建KML格式的数据发送到后端
  const kmlData = generateKmlFromPoints(points, form.title, form.description);

  // 创建虚拟的KML文件
  const kmlBlob = new Blob([kmlData], { type: 'application/vnd.google-earth.kml+xml' });
  const kmlFile = new File([kmlBlob], `${form.title}.kml`, {
    type: 'application/vnd.google-earth.kml+xml',
  });

  const formData = new FormData();
  formData.append('file', kmlFile);
  formData.append('title', form.title);
  formData.append('description', form.description);
  formData.append('sourceType', 'excel'); // 标记来源类型
  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId);
  }

  const res = await kmlApi.uploadKmlFile(formData, (progressEvent) => {
    if (progressEvent.lengthComputable) {
      setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
    }
  });

  if (!res.success) {
    throw new Error(res.message || '上传失败');
  }

  return res;
};

// 从Excel点位数据生成KML格式
const generateKmlFromPoints = (points, title, description) => {
  const placemarks = points
    .map(
      (point) => `
    <Placemark>
      <name><![CDATA[${point.name}]]></name>
      <description><![CDATA[${point.description || description || ''}]]></description>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${title}]]></name>
    <description><![CDATA[${description || '从Excel文件导入的点位数据'}]]></description>
    ${placemarks}
  </Document>
</kml>`;
};
</script>

<style scoped>
.coordinate-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 14px;

  .el-icon {
    font-size: 16px;
  }
}

.basemap-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #909399;
  font-size: 13px;

  .el-icon {
    font-size: 14px;
  }
}
</style>
