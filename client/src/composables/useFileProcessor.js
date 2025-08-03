import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useVideoProcessor() {
  const previewUrl = ref('')
  
  const processFile = async (file, form) => {
    // 自动提取文件名作为标题
    if (!form.title && file.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      form.title = nameWithoutExt
    }
    
    // 创建预览URL
    if (file) {
      previewUrl.value = URL.createObjectURL(file)
    }
    
    return { previewUrl: previewUrl.value }
  }
  
  const validateFile = (file) => {
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
  
  const processFile = async (file, form) => {
    // 自动提取文件名作为标题
    if (!form.title && file.name) {
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
      
      if (response.success) {
        validationResult.value = response.data
        if (response.data.valid) {
          ElMessage.success(`KML文件验证成功，包含 ${response.data.placemarkCount} 个地标`)
        } else {
          ElMessage.error('KML文件格式错误: ' + response.data.error)
        }
      }
    } catch (error) {
      ElMessage.error('验证KML文件失败: ' + error.message)
      validationResult.value = { valid: false, error: error.message }
    }
  }
  
  const validateFile = (file) => {
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
    const { imageProcessor } = await import('@/services/ImageProcessor.js')
    
    await imageProcessor.processFile(file, {
      onSuccess: (result) => {
        form.file = result.file
        form.title = result.title
        previewUrl.value = result.previewUrl
        
        if (result.gpsData) {
          form.lat = result.gpsData.lat.toString()
          form.lng = result.gpsData.lng.toString()
          ElMessage.success('已自动提取图片中的GPS坐标')
        }
      },
      onError: (error) => {
        ElMessage.error(error.message)
      }
    })
  }
  
  const validateFile = (file) => {
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
  
  return {
    previewUrl,
    processFile,
    validateFile
  }
}