<template>
  <BaseUploadDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="添加KML文件"
    title-placeholder="请输入KML文件标题"
    description-placeholder="请输入KML文件描述"
    :submit-handler="handleKmlUpload"
    :external-can-submit="kmlCanSubmit"
    @success="$emit('success')"
  >
    <template #file-upload="{ form, uploadRef }">
      <!-- 坐标系说明 -->
      <el-form-item label="坐标系说明">
        <div class="coordinate-info">
          <el-icon><InfoFilled /></el-icon>
          <span>KML文件使用WGS-84坐标系，系统将自动转换为适合地图显示的坐标</span>
        </div>
      </el-form-item>
      
      <KmlUploadArea
        :ref="uploadRef"
        v-model:file="form.file"
        v-model:validation-result="validationResult"
        @file-change="handleFileChange"
        @file-remove="handleFileRemove"
      />
      
      <!-- 地标预览 -->
      <el-form-item 
        v-if="validationResult?.valid && validationResult.placemarks?.length > 0" 
        label="地标预览"
      >
        <div class="placemarks-preview">
          <div class="preview-header">
            <span>前 {{ Math.min(5, validationResult.placemarks.length) }} 个地标：</span>
          </div>
          <div class="placemark-list">
            <div 
              v-for="(placemark, index) in validationResult.placemarks.slice(0, 5)" 
              :key="index"
              class="placemark-item"
            >
              <div class="placemark-name">{{ placemark.name || '未命名地标' }}</div>
              <div class="placemark-info">
                <span class="placemark-type">{{ getPlacemarkTypeText(placemark.pointType) }}</span>
                <span class="placemark-coords">
                  {{ placemark.latitude?.toFixed(4) }}, {{ placemark.longitude?.toFixed(4) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </el-form-item>
    </template>
  </BaseUploadDialog>
</template>

<script setup>
import { ref, computed, defineEmits, defineProps } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import BaseUploadDialog from './BaseUploadDialog.vue'
import KmlUploadArea from './KmlUploadArea.vue'
import { useKmlProcessor } from '@/composables/useFileProcessor'
import { kmlApi } from '@/api/kml.js'

const props = defineProps({
  modelValue: Boolean
})

defineEmits(['update:modelValue', 'success'])

const { validationResult, processFile, validateFile } = useKmlProcessor()

// 添加KML特定的提交检查
const kmlCanSubmit = computed(() => {
  console.log('kmlCanSubmit 更新:', validationResult.value?.valid) // 调试用
  return validationResult.value?.valid === true
})

const handleFileChange = async (file) => {
  if (validateFile(file)) {
    await processFile(file)
  }
}

const handleFileRemove = () => {
  validationResult.value = null
}

const getPlacemarkTypeText = (type) => {
  const typeMap = {
    'Point': '点',
    'LineString': '线',
    'Polygon': '面'
  }
  return typeMap[type] || type
}

const handleKmlUpload = async (form, { setProgress, setProcessing }) => {
  if (!validationResult.value?.valid) {
    throw new Error('请先上传有效的KML文件')
  }
  
  setProcessing(true, '正在处理KML文件...')
  
  const formData = new FormData()
  formData.append('file', form.file)
  formData.append('title', form.title)
  formData.append('description', form.description)
  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId)
  }
  
  const response = await kmlApi.uploadKmlFile(formData, (progressEvent) => {
    if (progressEvent.lengthComputable) {
      setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
    }
  })
  
  if (!response.data.success) {
    throw new Error(response.data.message || '上传失败')
  }
  
  return response
}
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

.placemarks-preview {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  background-color: #fafafa;
  
  .preview-header {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 8px;
  }
  
  .placemark-list {
    .placemark-item {
      padding: 8px 0;
      border-bottom: 1px solid #ebeef5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .placemark-name {
        font-weight: 500;
        color: #303133;
        margin-bottom: 4px;
      }
      
      .placemark-info {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: #909399;
        
        .placemark-type {
          background-color: #e4e7ed;
          padding: 2px 6px;
          border-radius: 2px;
        }
      }
    }
  }
}
</style>