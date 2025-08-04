import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { folderApi } from '@/api/folder.js'

export function useFileManagement() {
  // 响应式数据
  const fileList = ref([])
  const loading = ref(false)
  const selectedFolder = ref(null)

  const searchForm = reactive({
    fileType: 'all',
    keyword: '',
    includeHidden: false
  })

  const pagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 加载文件列表
  const loadFileList = async () => {
    try {
      loading.value = true
      const folderId = selectedFolder.value?.id || 0
      
      const response = await folderApi.getFolderContents(folderId, {
        ...searchForm,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      
      fileList.value = response.data
      pagination.total = response.pagination?.total || response.data.length
    } catch (error) {
      console.error('请求详细错误:', error)
      ElMessage.error('加载文件列表失败: ' + error.message)
    } finally {
      loading.value = false
    }
  }

  // 搜索
  const handleSearch = async () => {
    pagination.page = 1
    await loadFileList()
  }

  // 重置搜索
  const resetSearch = async () => {
    searchForm.fileType = 'all'
    searchForm.keyword = ''
    searchForm.includeHidden = false
    pagination.page = 1
    await loadFileList()
  }

  // 分页大小变化
  const handleSizeChange = async (size) => {
    pagination.pageSize = size
    pagination.page = 1
    await loadFileList()
  }

  // 当前页变化
  const handleCurrentChange = async (page) => {
    pagination.page = page
    await loadFileList()
  }

  // 文件夹选择处理
  const handleFolderSelected = (folder) => {
    selectedFolder.value = folder
    pagination.page = 1
    loadFileList()
  }

  // 格式化工具函数
  const getFileTypeColor = (fileType) => {
    const colors = {
      panorama: 'primary',
      video: 'success', 
      kml: 'warning'
    }
    return colors[fileType] || 'info'
  }

  const getFileThumbnail = (file) => {
    if (file.fileType === 'panorama') {
      return file.thumbnailUrl || file.imageUrl || '/default-panorama.jpg'
    } else if (file.fileType === 'video') {
      return file.thumbnailUrl || '/default-video.jpg'
    } else if (file.fileType === 'kml') {
      return '/default-kml.jpg'
    }
    return '/default-file.jpg'
  }

  const formatCoordinate = (lat, lng) => {
    // 转换为数字类型
    const numLat = parseFloat(lat)
    const numLng = parseFloat(lng)
    
    // 检查是否为有效数字（包括 0）
    if (isNaN(numLat) || isNaN(numLng)) {
      return '未知位置'
    }
    
    return `${numLat.toFixed(4)}, ${numLng.toFixed(4)}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return '未知时间'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  return {
    // 数据
    fileList,
    loading,
    selectedFolder,
    searchForm,
    pagination,
    
    // 方法
    loadFileList,
    handleSearch,
    resetSearch,
    handleSizeChange,
    handleCurrentChange,
    handleFolderSelected,
    
    // 工具函数
    getFileTypeColor,
    getFileThumbnail,
    formatCoordinate,
    formatDate
  }
}