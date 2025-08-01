<template>
  <el-dialog
    v-model="visible"
    title="上传全景图"
    width="600px"
    @close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入全景图标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入全景图描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="坐标" prop="coordinate">
        <div class="coordinate-input">
          <el-input
            v-model="form.lat"
            placeholder="纬度"
            type="number"
            step="0.000001"
          />
          <span class="separator">,</span>
          <el-input
            v-model="form.lng"
            placeholder="经度"
            type="number"
            step="0.000001"
          />
          <el-button @click="getCurrentLocation" :loading="locating" type="info">
            <el-icon><Location /></el-icon>
            定位
          </el-button>
        </div>
      </el-form-item>
      
      <el-form-item label="全景图" prop="file">
        <el-upload
          ref="uploadRef"
          class="panorama-upload"
          drag
          :auto-upload="false"
          :limit="1"
          accept="image/*"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :before-upload="beforeUpload"
        >
          <div class="upload-content">
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">
              <p>将全景图拖拽到此处，或<em>点击上传</em></p>
              <p class="upload-tip">支持 JPG、PNG 格式，宽高比约2:1的全景图</p>
              <p class="upload-tip">自动提取文件名和GPS坐标，大于8000x4000会自动压缩</p>
            </div>
          </div>
        </el-upload>
      </el-form-item>
      
      <!-- 预览 -->
      <el-form-item v-if="previewUrl" label="预览">
        <div class="preview-container">
          <img :src="previewUrl" alt="预览" class="preview-image" />
        </div>
      </el-form-item>
      
      <!-- 处理状态 -->
      <el-form-item v-if="processing" label="处理状态">
        <div class="processing-status">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>{{ processingText }}</span>
        </div>
      </el-form-item>
      
      <!-- 上传进度 -->
      <el-form-item v-if="uploading" label="上传进度">
        <el-progress
          :percentage="uploadProgress"
          :status="uploadProgress === 100 ? 'success' : ''"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          @click="handleSubmit"
          type="primary"
          :loading="uploading"
          :disabled="!form.file || processing || uploading"
        >
          {{ uploading ? '上传中...' : '确定上传' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, UploadFilled, Loading } from '@element-plus/icons-vue'
import { uploadPanoramaImage } from '@/api/panorama.js'
import { usePanoramaStore } from '@/store/panorama.js'
import { 
  isPanoramaImage, 
  extractTitleFromFilename, 
  extractGPSFromImage, 
  compressImage,
  getImageDimensions,
  isImageFile 
} from '@/utils/image-utils.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单引用
const formRef = ref(null)
const uploadRef = ref(null)

// Store
const panoramaStore = usePanoramaStore()

// 表单数据
const form = reactive({
  title: '',
  description: '',
  lat: '',
  lng: '',
  file: null
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
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
  ],
  file: [
    { required: true, message: '请选择全景图文件', trigger: 'change' }
  ]
}

// 状态
const uploading = ref(false)
const uploadProgress = ref(0)
const locating = ref(false)
const previewUrl = ref('')
const processing = ref(false)
const processingText = ref('')

// 文件变化处理
const handleFileChange = async (file) => {
  const rawFile = file.raw
  
  processing.value = true
  processingText.value = '正在检查文件...'
  
  try {
    // 检查是否为图片文件
    if (!isImageFile(rawFile)) {
      ElMessage.error('请选择图片文件！')
      uploadRef.value?.clearFiles()
      return
    }
    
    processingText.value = '正在验证全景图格式...'
    
    // 检查是否为全景图
    const isPanorama = await isPanoramaImage(rawFile)
    if (!isPanorama) {
      ElMessage.error('请选择全景图！全景图的宽高比应该约为2:1，且尺寸不小于1000x500')
      uploadRef.value?.clearFiles()
      return
    }
    
    form.file = rawFile
    
    // 自动设置标题为文件名（不含扩展名）
    const title = extractTitleFromFilename(file.name)
    form.title = title
    
    processingText.value = '正在提取GPS坐标...'
    
    // 尝试从图片中提取GPS坐标
    try {
      const gpsData = await extractGPSFromImage(rawFile)
      if (gpsData) {
        form.lat = gpsData.lat.toString()
        form.lng = gpsData.lng.toString()
        ElMessage.success('已自动提取图片中的GPS坐标')
      }
    } catch (error) {
      console.warn('提取GPS坐标失败:', error)
    }
    
    processingText.value = '正在生成预览...'
    
    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      previewUrl.value = e.target.result
      processing.value = false
      processingText.value = ''
    }
    reader.readAsDataURL(rawFile)
    
  } catch (error) {
    console.error('处理文件时出错:', error)
    ElMessage.error('处理文件时出错，请重试')
    processing.value = false
    processingText.value = ''
    uploadRef.value?.clearFiles()
  }
}

// 文件移除处理
const handleFileRemove = () => {
  form.file = null
  previewUrl.value = ''
}

// 上传前检查
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt50M = file.size / 1024 / 1024 < 50

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt50M) {
    ElMessage.error('图片大小不能超过 50MB!')
    return false
  }
  return true
}

// 获取当前位置
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('浏览器不支持地理定位')
    return
  }
  
  locating.value = true
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.lat = position.coords.latitude.toFixed(6)
      form.lng = position.coords.longitude.toFixed(6)
      locating.value = false
      ElMessage.success('定位成功')
    },
    (error) => {
      console.error('定位失败:', error)
      locating.value = false
      ElMessage.error('定位失败，请手动输入坐标')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  )
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    // 表单验证
    await formRef.value.validate()
    
    uploading.value = true
    uploadProgress.value = 0
    
    // 检查图片尺寸并压缩
    let fileToUpload = form.file
    const dimensions = await getImageDimensions(form.file)
    
    if (dimensions.width > 8000 || dimensions.height > 4000) {
      ElMessage.info('图片尺寸较大，正在压缩...')
      fileToUpload = await compressImage(form.file, 8000, 4000, 0.9)
      ElMessage.success(`图片已压缩：${dimensions.width}x${dimensions.height} → 8000x4000`)
    }
    
    // 准备上传数据
    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('title', form.title)
    formData.append('description', form.description)
    formData.append('lat', form.lat)
    formData.append('lng', form.lng)
    
    // 上传文件
    const newPanorama = await uploadPanoramaImage(formData, (progress) => {
      uploadProgress.value = progress
    })
    
    // 将返回的新全景图添加到 store
    panoramaStore.addPanorama(newPanorama)
    
    ElMessage.success('上传成功')
    emit('success')
    handleClose()
    
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败: ' + error.message)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  form.title = ''
  form.description = ''
  form.lat = ''
  form.lng = ''
  form.file = null
  
  previewUrl.value = ''
  uploadProgress.value = 0
  processing.value = false
  processingText.value = ''
  
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}
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

.panorama-upload {
  width: 100%;
  
  :deep(.el-upload) {
    width: 100%;
  }
  
  :deep(.el-upload-dragger) {
    width: 100%;
    height: 180px;
  }
  
  .upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    
    .upload-icon {
      font-size: 48px;
      color: #c0c4cc;
      margin-bottom: 16px;
    }
    
    .upload-text {
      text-align: center;
      
      p {
        margin: 0 0 8px;
        color: #606266;
        
        em {
          color: $primary-color;
          font-style: normal;
        }
      }
      
      .upload-tip {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.preview-container {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  
  .preview-image {
    width: 100%;
    height: auto;
    display: block;
  }
}

.processing-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
  
  .el-icon {
    font-size: 16px;
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