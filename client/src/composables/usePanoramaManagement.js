import { ref, reactive, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { usePanoramaStore } from '@/store/panorama.js'
import { useFolderStore } from '@/store/folder.js'

export function usePanoramaManagement() {
  // Store
  const panoramaStore = usePanoramaStore()
  const folderStore = useFolderStore()
  const { panoramas, loading, pagination } = storeToRefs(panoramaStore)

  // 响应式数据
  const searchForm = reactive({
    keyword: '',
    includeHidden: false
  })
  
  const selectedRows = ref([])
  const selectedFolder = ref(null)

  // 计算属性
  const folderPath = computed(() => {
    if (!selectedFolder.value) return []
    return folderStore.getFolderPath(selectedFolder.value.id)
  })

  // 加载数据
  const loadData = async () => {
    try {
      const params = {
        ...searchForm,
        folderId: selectedFolder.value?.id || null
      }
      await panoramaStore.fetchPanoramas(params)
    } catch (error) {
      ElMessage.error('加载数据失败: ' + error.message)
    }
  }

  // 加载文件夹
  const loadFolders = async () => {
    try {
      await folderStore.fetchFolders()
    } catch (error) {
      ElMessage.error('加载文件夹失败: ' + error.message)
    }
  }

  // 搜索
  const handleSearch = async (params) => {
    Object.assign(searchForm, params)
    panoramaStore.setSearchParams(searchForm)
    await loadData()
  }

  // 重置搜索
  const resetSearch = async () => {
    searchForm.keyword = ''
    searchForm.includeHidden = false
    panoramaStore.clearSearchParams()
    await loadData()
  }

  // 文件夹选择
  const handleFolderSelected = (folder) => {
    selectedFolder.value = folder
    selectedRows.value = []
    loadData()
  }

  return {
    // 数据
    panoramas,
    loading,
    pagination,
    selectedRows,
    selectedFolder,
    searchForm,
    folderPath,
    
    // 方法
    loadData,
    loadFolders,
    handleSearch,
    resetSearch,
    handleFolderSelected
  }
}