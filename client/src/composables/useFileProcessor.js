import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useVideoProcessor() {
  const previewUrl = ref('')
  
  const processFile = async (file, form) => {
    console.log('useVideoProcessor processFile called with:', file, 'form:', form)
    
    // 设置文件到表单
    form.file = file
    console.log('Form file set to:', form.file)
    
    // 自动提取文件名作为标题
    if (!form.title && file.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      form.title = nameWithoutExt
      console.log('Form title set to:', form.title)
    }
    
    // 创建预览URL
    if (file) {
      previewUrl.value = URL.createObjectURL(file)
      console.log('Preview URL created:', previewUrl.value)
    }
    
    return { previewUrl: previewUrl.value }
  }
  
  const validateFile = (file) => {
    // 检查文件对象是否有效
    if (!file || typeof file !== 'object') {
      ElMessage.error('文件对象无效!')
      return false
    }
    
    if (!file.type || !file.size) {
      ElMessage.error('文件信息不完整!')
      return false
    }
    
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
  
  const cleanup = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }
  }
  
  return {
    previewUrl,
    processFile,
    validateFile,
    cleanup
  }
}

export function useKmlProcessor() {
  const validationResult = ref(null)
  
  const processFile = async (file, form = null) => {
    // 如果传入了 form 且没有标题，则自动提取文件名作为标题
    if (form && !form.title && file.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      form.title = nameWithoutExt
    }
    
    // 验证KML文件
    await validateKmlFile(file)
  }
  
  const validateKmlFile = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const { kmlApi } = await import('@/api/kml.js')
      const response = await kmlApi.validateKmlFile(formData)
      
      // response 现在是后端返回的完整响应体：{ success: true, data: {...} }
      if (response && response.success && response.data) {
        validationResult.value = response.data
        if (response.data.valid) {
          ElMessage.success(`KML文件验证成功，包含 ${response.data.placemarkCount || 0} 个地标`)
        } else {
          ElMessage.error('KML文件格式错误: ' + response.data.error)
        }
      } else {
        const errorMsg = response?.message || '验证失败'
        ElMessage.error('验证失败: ' + errorMsg)
        validationResult.value = { valid: false, error: errorMsg }
      }
    } catch (error) {
      console.error('验证KML文件失败:', error)
      ElMessage.error('验证KML文件失败: ' + error.message)
      validationResult.value = { valid: false, error: error.message }
    }
  }
  
  const validateFile = (file) => {
    if (!file || typeof file !== 'object') {
      ElMessage.error('文件对象无效!')
      return false
    }
    
    if (!file.name || !file.size) {
      ElMessage.error('文件信息不完整!')
      return false
    }
    
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
  
  return {
    validationResult,
    processFile,
    validateFile
  }
}

export function usePanoramaProcessor() {
  const previewUrl = ref('')
  
  const processFile = async (file, form) => {
    console.log('usePanoramaProcessor processFile called with:', file, 'form:', form)
    
    const { imageProcessor } = await import('@/services/ImageProcessor.js')
    
    try {
      const result = await imageProcessor.processFile(file)
      console.log('ImageProcessor result:', result)
      
      // 设置文件到表单
      if (form) {
        form.file = result.file
        
        // 自动设置标题（如果表单中没有标题）
        if (!form.title && result.title) {
          form.title = result.title
        }
        
        // 设置GPS坐标（如果有的话）
        if (result.gpsData) {
          form.lat = result.gpsData.lat.toString()
          form.lng = result.gpsData.lng.toString()
          ElMessage.success('已自动提取图片中的GPS坐标')
        }
      }
      
      // 设置预览URL
      previewUrl.value = result.previewUrl
      
      return result
      
    } catch (error) {
      console.error('处理文件失败:', error)
      ElMessage.error(error.message)
      throw error
    }
  }
  
  const validateFile = (file) => {
    console.log('usePanoramaProcessor validateFile called with:', file)
    
    // 检查文件对象是否有效
    if (!file || typeof file !== 'object') {
      console.error('usePanoramaProcessor: 文件对象无效!', file)
      ElMessage.error('文件对象无效!')
      return false
    }
    
    if (!file.type || !file.size) {
      console.error('usePanoramaProcessor: 文件信息不完整!', { type: file.type, size: file.size })
      ElMessage.error('文件信息不完整!')
      return false
    }
    
    const isImage = file.type.startsWith('image/')
    const isLt50M = file.size / 1024 / 1024 < 50
    
    console.log('usePanoramaProcessor: File validation - isImage:', isImage, 'isLt50M:', isLt50M, 'type:', file.type, 'size:', file.size)
    
    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt50M) {
      ElMessage.error('图片大小不能超过 50MB!')
      return false
    }
    
    console.log('usePanoramaProcessor: File validation passed')
    return true
  }
  
  return {
    previewUrl,
    processFile,
    validateFile
  }
}