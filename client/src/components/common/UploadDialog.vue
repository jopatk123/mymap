<template>
  <BaseUploadDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="上传全景图"
    title-placeholder="请输入全景图标题"
    description-placeholder="请输入全景图描述"
    :needs-coordinates="true"
    :show-location-btn="false"
    :additional-rules="panoramaRules"
    :submit-handler="handlePanoramaUpload"
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
import { ref, defineEmits, defineProps } from 'vue'
import BaseUploadDialog from './BaseUploadDialog.vue'
import PanoramaUploadArea from './PanoramaUploadArea.vue'
import { usePanoramaProcessor } from '@/composables/useFileProcessor'
import { uploadPanoramaImage } from '@/api/panorama.js'
import { usePanoramaStore } from '@/store/panorama.js'
import { imageProcessor } from '@/services/ImageProcessor.js'

const props = defineProps({
  modelValue: Boolean
})

defineEmits(['update:modelValue', 'success'])

const { previewUrl, processFile, validateFile, cleanup } = usePanoramaProcessor()
const gpsInfo = ref(null)
const panoramaStore = usePanoramaStore()

// 全景图特有的验证规则
const panoramaRules = {
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

const handleFileChange = async (file, form) => {
  console.log('UploadDialog handleFileChange called with:', file, 'form:', form)
  
  // 检查文件对象是否有效
  if (!file || typeof file !== 'object') {
    console.error('UploadDialog: 文件对象无效!', file)
    return
  }
  
  if (validateFile(file)) {
    console.log('File validation passed, processing...')
    
    try {
      await processFile(file, form)
      console.log('File processing completed successfully')
    } catch (error) {
      console.error('处理文件时出错:', error)
    }
  } else {
    console.log('File validation failed')
  }
}

const handleFileRemove = () => {
  cleanup()
  gpsInfo.value = null
}

const handlePanoramaUpload = async (form, { setProgress, setProcessing }) => {
  // 检查图片尺寸并压缩
  setProcessing(true, '正在处理图片...')
  
  const compressionResult = await imageProcessor.compressImageIfNeeded(form.file)
  let fileToUpload = compressionResult.file
  
  if (compressionResult.compressed) {
    setProcessing(true, '正在压缩图片...')
    setProcessing(true, `图片已压缩：${compressionResult.originalDimensions.width}x${compressionResult.originalDimensions.height} → ${compressionResult.newDimensions.width}x${compressionResult.newDimensions.height}`)
  }
  
  const formData = new FormData()
  formData.append('file', fileToUpload)
  formData.append('title', form.title)
  formData.append('description', form.description)
  formData.append('lat', form.lat)
  formData.append('lng', form.lng)
  if (form.folderId !== undefined && form.folderId !== null) {
    formData.append('folderId', form.folderId)
  }
  
  // 上传文件
  const newPanorama = await uploadPanoramaImage(formData, (progress) => {
    setProgress(progress)
  })
  
  // 上传成功后由页面统一处理数据刷新
  
  // 重新加载文件夹数据以更新点位数量
  try {
    const { useFolderStore } = await import('@/store/folder.js')
    const folderStore = useFolderStore()
    await folderStore.fetchFolders()
  } catch (error) {
    console.warn('重新加载文件夹数据失败:', error)
  }
  
  return newPanorama
}
</script>