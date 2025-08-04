import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deletePanorama } from '@/api/panorama.js'
import { videoApi } from '@/api/video.js'
import { kmlApi } from '@/api/kml.js'

export function useFileOperations() {
  // 当前操作的文件
  const currentFile = ref(null)
  
  // 对话框状态
  const dialogStates = reactive({
    showEditDialog: false,
    showViewDialog: false,
    showMoveDialog: false
  })

  // 移动相关状态
  const moveToFolderId = ref(null)
  const movingFiles = ref([])
  const moving = ref(false)

  // 查看文件
  const viewFile = (file) => {
    currentFile.value = file
    dialogStates.showViewDialog = true
  }

  // 编辑文件
  const editFile = (file) => {
    currentFile.value = file
    dialogStates.showEditDialog = true
  }

  // 删除文件
  const deleteFile = async (file, onSuccess) => {
    try {
      console.log('准备删除文件:', file)
      
      await ElMessageBox.confirm(
        `确定要删除${file.displayType}"${file.title}"吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      console.log('用户确认删除，开始调用API')
      
      // 根据文件类型调用相应的删除API
      let req
      switch (file.fileType) {
        case 'panorama':
          console.log('调用全景图删除API, ID:', file.id)
          req = deletePanorama(file.id)
          break
        case 'video':
          console.log('调用视频删除API, ID:', file.id)
          req = videoApi.deleteVideoPoint(file.id)
          break
        case 'kml':
          console.log('调用KML删除API, ID:', file.id)
          req = kmlApi.deleteKmlFile(file.id)
          break
        default:
          throw new Error('未知文件类型')
      }
      
      const result = await req
      console.log('删除API调用成功，结果:', result)
      
      ElMessage.success('删除成功')
      
      console.log('准备调用onSuccess回调')
      if (onSuccess) {
        await onSuccess()
        console.log('onSuccess回调执行完成')
      } else {
        console.warn('onSuccess回调未提供')
      }
      
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除失败:', error)
        ElMessage.error('删除失败: ' + error.message)
      } else {
        console.log('用户取消删除')
      }
    }
  }

  // 移动确认
  const handleMoveConfirm = async (onSuccess) => {
    try {
      moving.value = true
      
      // 根据文件类型分组处理移动
      // 这里需要根据实际的API实现
      
      ElMessage.success('移动成功')
      dialogStates.showMoveDialog = false
      moveToFolderId.value = null
      movingFiles.value = []
      onSuccess?.()
    } catch (error) {
      ElMessage.error('移动失败: ' + error.message)
    } finally {
      moving.value = false
    }
  }

  // 处理文件删除成功
  const handleFileDeleted = async (onSuccess) => {
    try {
      dialogStates.showViewDialog = false
      ElMessage.success('文件已从列表中移除')
      onSuccess?.()
    } catch (error) {
      console.error('删除文件后更新失败:', error)
      ElMessage.error('更新失败，请刷新页面')
    }
  }

  // 图片加载错误处理
  const handleImageError = (event) => {
    event.target.src = '/default-file.jpg'
  }

  return {
    // 数据
    currentFile,
    dialogStates,
    moveToFolderId,
    movingFiles,
    moving,
    
    // 方法
    viewFile,
    editFile,
    deleteFile,
    handleMoveConfirm,
    handleFileDeleted,
    handleImageError
  }
}