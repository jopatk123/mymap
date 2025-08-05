import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { folderApi } from '@/api/folder.js'
import { pointsApi } from '@/api/points.js'

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
      console.log('开始加载文件列表...')
      loading.value = true
      const folderId = selectedFolder.value?.id || 0
      
      console.log('请求参数:', {
        folderId,
        searchForm,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      
      // 使用文件夹API获取所有类型的文件（包括KML文件）
      console.log('🔥 调用文件夹内容API: /api/folders/{id}/contents')
      const response = await folderApi.getFolderContents(folderId, {
        keyword: searchForm.keyword,
        includeHidden: searchForm.includeHidden,
        fileType: searchForm.fileType,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      console.log('🔥 文件夹内容API响应:', response)
      
      console.log('API响应:', response)
      console.log('文件列表数据:', response.data)
      
      // 转换数据格式以适配现有组件
      fileList.value = response.data.map(item => ({
        ...item,
        fileType: item.fileType || item.type, // 'panorama', 'video', or 'kml'
        imageUrl: item.image_url || item.url,
        thumbnailUrl: item.thumbnail_url,
        latitude: item.latitude || item.lat,
        longitude: item.longitude || item.lng,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        folderId: item.folder_id,
        folderName: item.folder_name
      }))
      
      pagination.total = response.pagination?.total || response.data.length
      
      console.log('文件列表更新完成，当前文件数量:', fileList.value.length)
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
      return file.thumbnailUrl || file.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA2MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAxMEwyNSAxNUwzNSA1TDQ1IDIwSDEwTDIwIDEwWiIgZmlsbD0iI0NDQ0NDQyIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjEwIiByPSIzIiBmaWxsPSIjQ0NDQ0NDIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuWFqOaZr+WbvjwvdGV4dD4KPHN2Zz4K'
    } else if (file.fileType === 'video') {
      return file.thumbnailUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA2MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjRjBGMEYwIi8+Cjxwb2x5Z29uIHBvaW50cz0iMjIsMTAgMzUsMTggMjIsMjYiIGZpbGw9IiM2NjY2NjYiLz4KPHR5ZXh0IHg9IjMwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuinhumikeaWh+S7tjwvdGV4dD4KPHN2Zz4K'
    } else if (file.fileType === 'kml') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA2MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjRkFGQUZBIi8+CjxwYXRoIGQ9Ik0yNSA4TDM1IDEyTDMwIDIyTDIwIDIyTDI1IDhaTTMwIDEwTDI4IDEyTDMwIDE0TDMyIDEyTDMwIDEwWiIgZmlsbD0iIzMzOTlGRiIvPgo8dGV4dCB4PSIzMCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5LTUzmlofku7Y8L3RleHQ+Cjwvc3ZnPgo='
    }
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA2MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjRjVGNUY1Ii8+CjxyZWN0IHg9IjIwIiB5PSI4IiB3aWR0aD0iMjAiIGhlaWdodD0iMTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0NDQ0NDQyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuaWh+S7tjwvdGV4dD4KPHN2Zz4K'
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