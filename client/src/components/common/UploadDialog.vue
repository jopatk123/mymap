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
      
      <!-- 文件夹选择 -->
      <el-form-item label="文件夹" prop="folderId">
        <el-select
          v-model="form.folderId"
          placeholder="选择文件夹"
          clearable
          style="width: 100%"
        >
          <el-option
            label="默认文件夹"
            :value="0"
          />
          <el-option
            v-for="folder in validFolders"
            :key="folder.id"
            :label="folder.name || '未命名文件夹'"
            :value="folder.id"
          />
        </el-select>
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
import { imageProcessor } from '@/services/ImageProcessor.js'
import { locationService } from '@/services/LocationService.js'

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

// 文件夹数据
const folders = ref([])

// 有效文件夹（过滤掉无效数据）
const validFolders = computed(() => {
  return folders.value.filter(folder => 
    folder && 
    folder.id !== null && 
    folder.id !== undefined &&
    (typeof folder.id === 'number' || typeof folder.id === 'string')
  )
})

// 加载文件夹
const loadFolders = async () => {
  try {
    const { folderApi } = await import('@/api/folder.js')
    const response = await folderApi.getFolders()
    folders.value = response || []
  } catch (error) {
    console.error('加载文件夹失败:', error)
    folders.value = []
  }
}

// 表单数据
const form = reactive({
  title: '',
  description: '',
  lat: '',
  lng: '',
  file: null,
  folderId: 0
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
        const validation = locationService.validateCoordinates(value, form.lng)
        if (!validation.valid && validation.errors.some(err => err.includes('纬度'))) {
          callback(new Error(validation.errors.find(err => err.includes('纬度'))))
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
        const validation = locationService.validateCoordinates(form.lat, value)
        if (!validation.valid && validation.errors.some(err => err.includes('经度'))) {
          callback(new Error(validation.errors.find(err => err.includes('经度'))))
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

// 设置服务回调
imageProcessor.setCallbacks({
  onProcessingChange: (isProcessing) => {
    processing.value = isProcessing
  },
  onTextChange: (text) => {
    processingText.value = text
  },
  onError: (error) => {
    ElMessage.error(error.message)
    uploadRef.value?.clearFiles()
  },
  onSuccess: (result) => {
    form.file = result.file
    form.title = result.title
    previewUrl.value = result.previewUrl
    
    if (result.gpsData) {
      form.lat = result.gpsData.lat.toString()
      form.lng = result.gpsData.lng.toString()
      ElMessage.success('已自动提取图片中的GPS坐标')
    }
  }
})

locationService.setCallbacks({
  onLocationStart: () => {
    locating.value = true
  },
  onLocationSuccess: (location) => {
    form.lat = location.lat.toFixed(6)
    form.lng = location.lng.toFixed(6)
    ElMessage.success('定位成功')
  },
  onLocationError: (error) => {
    ElMessage.error(error.message)
  },
  onLocationEnd: () => {
    locating.value = false
  }
})

// 文件变化处理
const handleFileChange = async (file) => {
  try {
    await imageProcessor.processFile(file.raw)
  } catch (error) {
    console.error('处理文件失败:', error)
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
const getCurrentLocation = async () => {
  try {
    await locationService.getCurrentLocation()
  } catch (error) {
    console.error('定位失败:', error)
  }
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
    const compressionResult = await imageProcessor.compressImageIfNeeded(form.file)
    let fileToUpload = compressionResult.file
    
    if (compressionResult.compressed) {
      ElMessage.info('图片尺寸较大，正在压缩...')
      ElMessage.success(`图片已压缩：${compressionResult.originalDimensions.width}x${compressionResult.originalDimensions.height} → ${compressionResult.newDimensions.width}x${compressionResult.newDimensions.height}`)
    }
    
    // 准备上传数据
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
      uploadProgress.value = progress
    })
    
    // 将返回的新全景图添加到 store
    panoramaStore.addPanorama(newPanorama)
    
    // 重新加载文件夹数据以更新点位数量
    try {
      const { useFolderStore } = await import('@/store/folder.js')
      const folderStore = useFolderStore()
      await folderStore.fetchFolders()
    } catch (error) {
      console.warn('重新加载文件夹数据失败:', error)
    }
    
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
  form.folderId = 0
  
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