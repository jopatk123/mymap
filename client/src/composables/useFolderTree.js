import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useFolderStore } from '@/store/folder.js'

export function useFolderTree() {
  const folderStore = useFolderStore()
  
  // 响应式数据
  const selectedFolder = ref(null)
  
  // 计算属性
  const folderTree = computed(() => folderStore.folderTree)
  const flatFolders = computed(() => folderStore.flatFolders)
  
  // 加载文件夹数据
  const loadFolders = async () => {
    try {
      await folderStore.fetchFolders()
    } catch (error) {
      ElMessage.error('加载文件夹失败: ' + error.message)
      throw error
    }
  }
  
  // 节点选择处理
  const handleFolderSelected = (folder) => {
    selectedFolder.value = folder
  }
  
  // 切换文件夹可见性
  const toggleFolderVisibility = async (folder) => {
    try {
      await folderStore.updateFolderVisibility(folder.id, !folder.is_visible)
      ElMessage.success(`文件夹已${folder.is_visible ? '隐藏' : '显示'}`)
      await loadFolders()
      return true
    } catch (error) {
      ElMessage.error('更新文件夹可见性失败: ' + error.message)
      throw error
    }
  }
  
  return {
    // 数据
    selectedFolder,
    folderTree,
    flatFolders,
    
    // 方法
    loadFolders,
    handleFolderSelected,
    toggleFolderVisibility
  }
}