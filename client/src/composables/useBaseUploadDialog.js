import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

export function useBaseUploadDialog(props, emit) {
  // 响应式数据
  const formRef = ref(null)
  const uploadRef = ref(null)
  const folders = ref([])
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const processing = ref(false)
  const processingText = ref('')

  // 计算属性
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  // 基础表单数据
  const form = reactive({
    title: '',
    description: '',
    lat: '',
    lng: '',
    file: null,
    folderId: null  // 初始为null，加载文件夹后设置为默认文件夹ID
  })

  // 基础验证规则
  const baseRules = {
    title: [
      { required: true, message: '请输入标题', trigger: 'blur' },
      { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
    ],
    file: [
      { 
        required: true, 
        message: '请选择文件', 
        trigger: 'change',
        validator: (rule, value, callback) => {
          if (!value) {
            callback(new Error('请选择文件'))
          } else {
            callback()
          }
        }
      }
    ]
  }

  // 坐标计算属性
  const coordinates = computed({
    get: () => ({ lat: form.lat, lng: form.lng }),
    set: (value) => {
      form.lat = value.lat
      form.lng = value.lng
    }
  })

  // 合并验证规则
  const computedRules = computed(() => ({
    ...baseRules,
    ...props.additionalRules
  }))

  // 提交按钮状态
  const canSubmit = computed(() => {
    const hasFile = form.file && form.file instanceof File
    const notUploading = !uploading.value && !processing.value
    return hasFile && notUploading
  })

  const submitButtonText = computed(() => {
    return uploading.value ? '上传中...' : '确定上传'
  })

  // 加载文件夹
  const loadFolders = async () => {
    try {
      const { folderApi } = await import('@/api/folder.js')
      const response = await folderApi.getFoldersFlat()
      folders.value = Array.isArray(response?.data) ? response.data : []
      
      // 设置默认文件夹ID
      if (folders.value.length > 0 && form.folderId === null) {
        // 查找名为"默认文件夹"的文件夹
        const defaultFolder = folders.value.find(folder => folder.name === '默认文件夹')
        if (defaultFolder) {
          form.folderId = defaultFolder.id
        } else {
          // 如果没有找到"默认文件夹"，使用第一个文件夹
          form.folderId = folders.value[0].id
        }
      }
    } catch (error) {
      console.error('加载文件夹失败:', error)
      folders.value = []
    }
  }

  // 提交处理
  const handleSubmit = async () => {
    if (!formRef.value) return
    
    try {
      await formRef.value.validate()
      
      uploading.value = true
      uploadProgress.value = 0
      
      await props.submitHandler(form, {
        setProgress: (progress) => { uploadProgress.value = progress },
        setProcessing: (isProcessing, text = '') => {
          processing.value = isProcessing
          processingText.value = text
        }
      })
      
      ElMessage.success('上传成功')
      emit('success')
      handleClose()
      
    } catch (error) {
      console.error('上传失败:', error)
      ElMessage.error('上传失败: ' + error.message)
    } finally {
      uploading.value = false
      uploadProgress.value = 0
      processing.value = false
    }
  }

  // 关闭对话框
  const handleClose = () => {
    visible.value = false
    resetForm() // 异步调用，但不等待
  }

  // 重置表单
  const resetForm = () => {
    if (formRef.value) {
      formRef.value.resetFields()
    }
    
    // 获取默认文件夹ID
    let defaultFolderId = null
    if (folders.value.length > 0) {
      const defaultFolder = folders.value.find(folder => folder.name === '默认文件夹')
      if (defaultFolder) {
        defaultFolderId = defaultFolder.id
      } else {
        defaultFolderId = folders.value[0].id
      }
    }
    
    Object.assign(form, {
      title: '',
      description: '',
      lat: '',
      lng: '',
      file: null,
      folderId: defaultFolderId
    })
    
    uploadProgress.value = 0
    processing.value = false
    processingText.value = ''
    
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
  }

  // 初始化
  onMounted(() => {
    loadFolders()
  })

  return {
    visible,
    form,
    formRef,
    uploadRef,
    folders,
    processing,
    processingText,
    uploading,
    uploadProgress,
    computedRules,
    coordinates,
    canSubmit,
    submitButtonText,
    handleClose,
    handleSubmit,
    resetForm,
    loadFolders
  }
}