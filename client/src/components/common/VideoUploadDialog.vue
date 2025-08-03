<template>
  <BaseUploadDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="添加视频点位"
    title-placeholder="请输入视频标题"
    description-placeholder="请输入视频描述"
    :needs-coordinates="true"
    :show-location-btn="true"
    :additional-rules="videoRules"
    :submit-handler="handleVideoUpload"
    @success="$emit('success')"
  >
    <template #file-upload="{ form, uploadRef }">
      <el-form-item label="拍摄坐标" required>
        <div class="coordinate-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>视频文件无法自动获取GPS信息，请手动输入拍摄地点的经纬度</span>
        </div>
      </el-form-item>
      
      <el-form-item label="视频时长" prop="duration">
        <el-input
          v-model="form.duration"
          placeholder="视频时长（秒）"
          type="number"
          min="0"
        >
          <template #suffix>秒</template>
        </el-input>
      </el-form-item>
      
      <VideoUploadArea
        :ref="uploadRef"
        v-model:file="form.file"
        :preview-url="previewUrl"
        @file-change="handleFileChange"
        @file-remove="handleFileRemove"
      />
    </template>
  </BaseUploadDialog>
</template>

<script setup>
import { defineEmits, defineProps } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import BaseUploadDialog from './BaseUploadDialog.vue'
import VideoUploadArea from './VideoUploadArea.vue'
import { useVideoProcessor } from '@/composables/useFileProcessor'
import { videoApi } from '@/api/video.js'

const props = defineProps({
  modelValue: Boolean
})

defineEmits(['update:modelValue', 'success'])

const { previewUrl, processFile, validateFile, cleanup } = useVideoProcessor()

// 视频特有的验证规则
const videoRules = {
  lat: [
    { required: true, message: '请输入纬度', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        const lat = parseFloat(value)
        if (isNaN(lat) || lat < -90 || lat > 90) {
          callback(new Error('纬度必须在 -90 到 90 之间'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  lng: [
    { required: true, message: '请输入经度', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        const lng = parseFloat(value)
        if (isNaN(lng) || lng < -180 || lng > 180) {
          callback(new Error('经度必须在 -180 到 180 之间'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

const handleFileChange = async (file) => {
  if (validateFile(file.raw)) {
    await processFile(file.raw, form)
  }
}

const handleFileRemove = () => {
  cleanup()
}

const handleVideoUpload = async (form, { setProgress }) => {
  const formData = new FormData()
  formData.append('file', form.file)
  formData.append('title', form.title)
  formData.append('description', form.description)
  formData.append('lat', form.lat)
  formData.append('lng', form.lng)
  if (form.duration) {
    formData.append('duration', form.duration)
  }
  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId)
  }
  
  return await videoApi.uploadVideo(formData, (progressEvent) => {
    if (progressEvent.lengthComputable) {
      setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
    }
  })
}
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