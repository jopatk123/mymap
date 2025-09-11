import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useKMLBaseMapStore } from '@/store/kml-basemap.js'

/**
 * KML底图管理组合式函数
 */
export function useKMLBaseMap() {
  const store = useKMLBaseMapStore()
  
  // 文件上传相关
  const uploadDialogVisible = ref(false)
  const uploading = ref(false)
  
  // 初始化
  const initialize = async () => {
    try {
      await store.fetchKMLFiles()
    } catch (error) {
      ElMessage.error('初始化KML底图失败')
      console.error(error)
    }
  }
  
  // 处理文件上传
  const handleFileUpload = async (file) => {
    if (!file) return
    
    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.kml')) {
      ElMessage.error('请选择KML格式的文件')
      return
    }
    
    // 验证文件大小（限制为10MB）
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过10MB')
      return
    }
    
    try {
      uploading.value = true
  await store.uploadKMLFile(file)

  // 通知 KML 侧栏与主文件列表刷新
  window.dispatchEvent(new CustomEvent('kml-files-updated'))
  window.dispatchEvent(new CustomEvent('show-kml-files'))
      
      ElMessage.success('KML文件上传成功')
      uploadDialogVisible.value = false
      
    } catch (error) {
      ElMessage.error('KML文件上传失败: ' + error.message)
    } finally {
      uploading.value = false
    }
  }
  
  // 删除KML文件
  const deleteKMLFile = async (fileId, fileName) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除KML文件"${fileName}"吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      await store.deleteKMLFile(fileId)
      ElMessage.success('KML文件删除成功')
      
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除KML文件失败: ' + error.message)
      }
    }
  }
  
  // 打开上传对话框
  const openUploadDialog = () => {
    uploadDialogVisible.value = true
  }
  
  // 关闭上传对话框
  const closeUploadDialog = () => {
    uploadDialogVisible.value = false
  }
  
  // 获取文件统计信息（返回普通数字，模板可直接读取）
  const fileStatistics = computed(() => {
    const files = store.kmlFiles && store.kmlFiles.value ? store.kmlFiles.value : (store.kmlFiles || [])
    const totalFiles = Array.isArray(files) ? files.length : (files?.length || 0)
    const totalPoints = (store.totalPointsCount && store.totalPointsCount.value) ? store.totalPointsCount.value : 0
    const visiblePoints = (store.visiblePointsCount && store.visiblePointsCount.value) ? store.visiblePointsCount.value : 0
    const areasCount = (store.areasCount && store.areasCount.value) ? store.areasCount.value : 0

    return {
      totalFiles,
      totalPoints,
      visiblePoints,
      areasCount
    }
  })
  
  return {
  // 响应式数据（模板中会自动解包这些 computed）
  kmlFiles: computed(() => store.kmlFiles && store.kmlFiles.value ? store.kmlFiles.value : []),
  kmlPoints: computed(() => store.kmlPoints && store.kmlPoints.value ? store.kmlPoints.value : []),
  visiblePoints: computed(() => store.visiblePoints && store.visiblePoints.value ? store.visiblePoints.value : []),
  loading: computed(() => (store.loading && typeof store.loading.value !== 'undefined') ? store.loading.value : false),
  uploadDialogVisible,
  uploading,

  // 计算属性
  fileStatistics,
    
    // 方法
    initialize,
    handleFileUpload,
    deleteKMLFile,
    openUploadDialog,
    closeUploadDialog
  }
}
