<template>
  <el-form-item label="全景图片" prop="file" required>
    <el-upload
      ref="uploadRef"
      class="panorama-uploader"
      drag
      :auto-upload="false"
      :show-file-list="false"
      :accept="accept"
      :limit="1"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
    >
      <div v-if="!file" class="upload-placeholder">
        <el-icon class="upload-icon"><Picture /></el-icon>
        <div class="upload-text">
          <p>点击或拖拽全景图片到此处</p>
          <p class="upload-hint">支持 JPG、PNG、WebP 等格式，最大 50MB</p>
        </div>
      </div>
      
      <div v-else class="upload-preview">
        <div class="image-preview">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="全景图预览"
            class="preview-image"
          />
        </div>
        
        <div class="file-info">
          <el-icon><Picture /></el-icon>
          <span class="file-name">{{ file.name }}</span>
          <el-button
            type="danger"
            :icon="Delete"
            circle
            size="small"
            @click.stop="handleRemove"
          />
        </div>
        
        <!-- GPS 信息显示 -->
        <div v-if="showGpsInfo && gpsInfo" class="gps-info">
          <el-icon><Location /></el-icon>
          <span>已提取GPS坐标: {{ gpsInfo.lat }}, {{ gpsInfo.lng }}</span>
        </div>
      </div>
    </el-upload>
  </el-form-item>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Picture, Delete, Location } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: File,
  previewUrl: String,
  gpsInfo: Object,
  showGpsInfo: {
    type: Boolean,
    default: true
  },
  accept: {
    type: String,
    default: 'image/*'
  }
})

const emit = defineEmits(['update:modelValue', 'update:previewUrl', 'update:gpsInfo', 'file-change', 'file-remove'])

const uploadRef = ref(null)

const file = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const previewUrl = computed({
  get: () => props.previewUrl,
  set: (value) => emit('update:previewUrl', value)
})

const gpsInfo = computed({
  get: () => props.gpsInfo,
  set: (value) => emit('update:gpsInfo', value)
})

const handleFileChange = async (file) => {
  console.log('PanoramaUploadArea handleFileChange called with:', file)
  
  // 检查文件对象是否有效
  if (!file || !file.raw) {
    console.error('PanoramaUploadArea: 文件对象无效!', file)
    ElMessage.error('文件对象无效!')
    return false
  }
  
  const rawFile = file.raw
  console.log('PanoramaUploadArea: Raw file object:', rawFile)
  
  // 检查原始文件对象
  if (!rawFile || !rawFile.type || !rawFile.size) {
    console.error('PanoramaUploadArea: 文件信息不完整!', rawFile)
    ElMessage.error('文件信息不完整!')
    return false
  }
  
  // 验证文件
  const isImage = rawFile.type.startsWith('image/')
  const isLt50M = rawFile.size / 1024 / 1024 < 50
  
  console.log('PanoramaUploadArea: File validation - isImage:', isImage, 'isLt50M:', isLt50M)
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  
  if (!isLt50M) {
    ElMessage.error('图片大小不能超过 50MB!')
    return false
  }
  
  file.value = rawFile
  console.log('PanoramaUploadArea: Emitting file-change event with rawFile:', rawFile)
  emit('file-change', rawFile)
  
  return true
}

const handleFileRemove = () => {
  file.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  gpsInfo.value = null
  emit('file-remove')
}

const handleRemove = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  handleFileRemove()
}

// 清理方法
const clearFiles = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  handleFileRemove()
}

defineExpose({
  clearFiles
})
</script>

<style scoped>
.panorama-uploader {
  width: 100%;
}

.upload-placeholder {
  padding: 40px 0;
  text-align: center;
  color: #909399;
}

.upload-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 8px 0;
  font-size: 14px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.upload-preview {
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fafafa;
}

.image-preview {
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 4px;
  margin-bottom: 12px;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  margin-bottom: 12px;
}

.file-name {
  flex: 1;
  margin: 0 12px;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gps-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 12px;
  color: #1890ff;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  min-height: 180px;
}
</style>