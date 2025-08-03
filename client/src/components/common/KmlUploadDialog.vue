<template>
  <el-dialog
    v-model="visible"
    title="添加KML文件"
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
          placeholder="请输入KML文件标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入KML文件描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="KML文件" prop="file">
        <el-upload
          ref="uploadRef"
          class="kml-upload"
          drag
          :auto-upload="false"
          :limit="1"
          accept=".kml"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :before-upload="beforeUpload"
        >
          <div class="upload-content">
            <el-icon class="upload-icon"><Document /></el-icon>
            <div class="upload-text">
              <p>将KML文件拖拽到此处，或<em>点击上传</em></p>
              <p class="upload-tip">支持标准KML格式文件</p>
              <p class="upload-tip">自动解析文件中的地标和坐标信息</p>
            </div>
          </div>
        </el-upload>
      </el-form-item>
      
      <!-- 文件验证结果 -->
      <el-form-item v-if="validationResult" label="文件验证">
        <div class="validation-result">
          <div v-if="validationResult.valid" class="validation-success">
            <el-icon><SuccessFilled /></el-icon>
            <span>KML文件格式正确，包含 {{ validationResult.placemarkCount }} 个地标</span>
          </div>
          <div v-else class="validation-error">
            <el-icon><CircleCloseFilled /></el-icon>
            <span>{{ validationResult.error }}</span>
          </div>
        </div>
      </el-form-item>
      
      <!-- 地标预览 -->
      <el-form-item v-if="validationResult?.valid && validationResult.placemarks?.length > 0" label="地标预览">
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
      
      <!-- 坐标系说明 -->
      <el-form-item label="坐标系说明">
        <div class="coordinate-info">
          <el-icon><InfoFilled /></el-icon>
          <span>KML文件使用WGS-84坐标系，系统将自动转换为适合地图显示的坐标</span>
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
          :disabled="!form.file || uploading || !validationResult?.valid"
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
import { Document, InfoFilled, SuccessFilled, CircleCloseFilled, Loading } from '@element-plus/icons-vue'

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

// 有效文件夹（过滤掉无效数据）
const validFolders = computed(() => {
  if (!Array.isArray(folders.value)) {
    return []
  }
  return folders.value.filter(folder => 
    folder && 
    folder.id !== null && 
    folder.id !== undefined &&
    (typeof folder.id === 'number' || typeof folder.id === 'string')
  )
})

// 表单数据
const form = reactive({
  title: '',
  description: '',
  file: null,
  folderId: 0
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  file: [
    { required: true, message: '请选择KML文件', trigger: 'change' }
  ]
}

// 状态
const uploading = ref(false)
const uploadProgress = ref(0)
const processing = ref(false)
const processingText = ref('')
const validationResult = ref(null)

// 初始化
onMounted(() => {
  loadFolders()
})

// 加载文件夹
const loadFolders = async () => {
  try {
    const { folderApi } = await import('@/api/folder.js')
    const response = await folderApi.getFolders()
    folders.value = Array.isArray(response) ? response : []
  } catch (error) {
    console.error('加载文件夹失败:', error)
    folders.value = []
  }
}

// 文件变化处理
const handleFileChange = async (file) => {
  form.file = file.raw
  
  // 自动提取文件名作为标题（如果标题为空）
  if (!form.title && file.name) {
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    form.title = nameWithoutExt
  }
  
  // 验证KML文件
  await validateKmlFile(file.raw)
}

// 文件移除处理
const handleFileRemove = () => {
  form.file = null
  validationResult.value = null
}

// 上传前检查
const beforeUpload = (file) => {
  const isKml = file.name.toLowerCase().endsWith('.kml')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isKml) {
    ElMessage.error('只能上传KML格式文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB!')
    return false
  }
  return true
}

// 验证KML文件
const validateKmlFile = async (file) => {
  try {
    processing.value = true
    processingText.value = '正在验证KML文件格式...'
    
    const formData = new FormData()
    formData.append('file', file)
    
    // 导入KML API
    const { kmlApi } = await import('@/api/kml.js')
    
    const response = await kmlApi.validateKmlFile(formData)
    
    
    if (response.success) {
      validationResult.value = response.data
      if (response.data.valid) {
        ElMessage.success(`KML文件验证成功，包含 ${response.data.placemarkCount} 个地标`)
      } else {
        ElMessage.error('KML文件格式错误: ' + response.data.error)
      }
    } else {
      throw new Error(response.message || '验证失败')
    }
  } catch (error) {
    console.error('验证KML文件失败:', error)
    console.error('错误详情:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    })
    ElMessage.error('验证KML文件失败: ' + error.message)
    validationResult.value = {
      valid: false,
      error: error.message || '网络错误或服务器连接失败'
    }
  } finally {
    processing.value = false
    processingText.value = ''
  }
}

// 获取地标类型文本
const getPlacemarkTypeText = (type) => {
  const typeMap = {
    'Point': '点',
    'LineString': '线',
    'Polygon': '面'
  }
  return typeMap[type] || type
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    // 表单验证
    await formRef.value.validate()
    
    if (!validationResult.value?.valid) {
      ElMessage.error('请先上传有效的KML文件')
      return
    }
    
    uploading.value = true
    uploadProgress.value = 0
    
    // 准备上传数据
    const formData = new FormData()
    formData.append('file', form.file)
    formData.append('title', form.title)
    formData.append('description', form.description)
    if (form.folderId !== undefined && form.folderId !== null) {
      formData.append('folderId', form.folderId)
    }
    
    // 导入KML API
    const { kmlApi } = await import('@/api/kml.js')
    
    // 上传文件
    const response = await kmlApi.uploadKmlFile(formData, (progressEvent) => {
      if (progressEvent.lengthComputable) {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    })
    
    if (response.data.success) {
      ElMessage.success('KML文件上传成功')
      emit('success')
      handleClose()
    } else {
      throw new Error(response.data.message || '上传失败')
    }
    
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传KML文件失败')
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
  form.file = null
  form.folderId = 0
  
  validationResult.value = null
  uploadProgress.value = 0
  processing.value = false
  processingText.value = ''
  
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}
</script>

<style lang="scss" scoped>
.kml-upload {
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

.validation-result {
  .validation-success {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #67c23a;
    
    .el-icon {
      font-size: 16px;
    }
  }
  
  .validation-error {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #f56c6c;
    
    .el-icon {
      font-size: 16px;
    }
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
</style>