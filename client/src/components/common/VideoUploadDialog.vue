<template>
  <el-dialog
    v-model="visible"
    title="添加视频点位"
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
          placeholder="请输入视频标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入视频描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="拍摄坐标" prop="coordinate" required>
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
      
      <el-form-item label="视频文件" prop="file">
        <el-upload
          ref="uploadRef"
          class="video-upload"
          drag
          :auto-upload="false"
          :limit="1"
          accept="video/*"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :before-upload="beforeUpload"
        >
          <div class="upload-content">
            <el-icon class="upload-icon"><VideoPlay /></el-icon>
            <div class="upload-text">
              <p>将视频文件拖拽到此处，或<em>点击上传</em></p>
              <p class="upload-tip">支持 MP4、AVI、MOV 等常见视频格式</p>
              <p class="upload-tip">文件大小不超过 500MB</p>
            </div>
          </div>
        </el-upload>
      </el-form-item>
      
      <!-- 预览 -->
      <el-form-item v-if="previewUrl" label="预览">
        <div class="preview-container">
          <video :src="previewUrl" controls class="preview-video">
            您的浏览器不支持视频播放
          </video>
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
            v-for="folder in folders"
            :key="folder.id"
            :label="folder.name"
            :value="folder.id"
          />
        </el-select>
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
          :disabled="!form.file || uploading"
        >
          {{ uploading ? '上传中...' : '确定上传' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, VideoPlay, InfoFilled } from '@element-plus/icons-vue'
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

// 文件夹数据
const folders = ref([])

// 表单数据
const form = reactive({
  title: '',
  description: '',
  lat: '',
  lng: '',
  duration: '',
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
    { required: true, message: '请选择视频文件', trigger: 'change' }
  ]
}

// 状态
const uploading = ref(false)
const uploadProgress = ref(0)
const locating = ref(false)
const previewUrl = ref('')

// 初始化
onMounted(() => {
  loadFolders()
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

// 设置定位服务回调
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
const handleFileChange = (file) => {
  form.file = file.raw
  
  // 自动提取文件名作为标题（如果标题为空）
  if (!form.title && file.name) {
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    form.title = nameWithoutExt
  }
  
  // 创建预览URL
  if (file.raw) {
    previewUrl.value = URL.createObjectURL(file.raw)
  }
}

// 文件移除处理
const handleFileRemove = () => {
  form.file = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

// 上传前检查
const beforeUpload = (file) => {
  const isVideo = file.type.startsWith('video/')
  const isLt500M = file.size / 1024 / 1024 < 500

  if (!isVideo) {
    ElMessage.error('只能上传视频文件!')
    return false
  }
  if (!isLt500M) {
    ElMessage.error('视频大小不能超过 500MB!')
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
    
    // 准备上传数据
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
    
    // 上传文件
    const response = await fetch('/api/video-points/upload', {
      method: 'POST',
      body: formData,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success('视频点位上传成功')
      emit('success')
      handleClose()
    } else {
      throw new Error(result.message || '上传失败')
    }
    
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
  form.duration = ''
  form.file = null
  form.folderId = 0
  
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  uploadProgress.value = 0
  
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

.coordinate-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  
  .el-icon {
    font-size: 14px;
  }
}

.video-upload {
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
          color: #409eff;
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
  max-height: 300px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  
  .preview-video {
    width: 100%;
    height: auto;
    max-height: 300px;
    display: block;
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