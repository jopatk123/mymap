import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePanoramaStore } from '@/store/panorama.js'

export function useBatchOperations() {
  const panoramaStore = usePanoramaStore()
  const selectedRows = ref([])
  const moving = ref(false)

  // 删除单个全景图
  const deletePanorama = async (panorama, onSuccess) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除全景图"${panorama.title}"吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      await panoramaStore.deletePanoramaAsync(panorama.id)
      ElMessage.success('删除成功')
      onSuccess?.()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败: ' + error.message)
      }
    }
  }

  // 切换全景图可见性
  const togglePanoramaVisibility = async (panorama, onSuccess) => {
    try {
      await panoramaStore.updatePanoramaVisibility(panorama.id, !panorama.is_visible)
      ElMessage.success(`全景图已${panorama.is_visible ? '隐藏' : '显示'}`)
      onSuccess?.()
    } catch (error) {
      ElMessage.error('更新可见性失败: ' + error.message)
    }
  }

  // 批量更新可见性
  const batchUpdateVisibility = async (selectedRows, isVisible, onSuccess) => {
    try {
      await ElMessageBox.confirm(
        `确定要${isVisible ? '显示' : '隐藏'}选中的 ${selectedRows.length} 个全景图吗？`,
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const ids = selectedRows.map(row => row.id)
      await panoramaStore.batchUpdatePanoramaVisibility(ids, isVisible)
      ElMessage.success(`批量${isVisible ? '显示' : '隐藏'}成功`)
      onSuccess?.()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(`批量${isVisible ? '显示' : '隐藏'}失败: ` + error.message)
      }
    }
  }

  // 批量删除
  const batchDelete = async (selectedRows, onSuccess) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedRows.length} 个全景图吗？`,
        '确认批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      const ids = selectedRows.map(row => row.id)
      await panoramaStore.batchDeletePanoramas(ids)
      ElMessage.success('批量删除成功')
      onSuccess?.()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('批量删除失败: ' + error.message)
      }
    }
  }

  // 移动全景图
  const movePanoramas = async (panoramaIds, targetFolderId, onSuccess) => {
    try {
      moving.value = true
      await panoramaStore.batchMovePanoramasToFolder(panoramaIds, targetFolderId)
      ElMessage.success('移动成功')
      onSuccess?.()
    } catch (error) {
      ElMessage.error('移动失败: ' + error.message)
    } finally {
      moving.value = false
    }
  }

  // 选择变化处理
  const handleSelectionChange = (selection) => {
    selectedRows.value = selection
  }

  // 批量操作处理
  const handleBatchAction = async (command, onSuccess) => {
    switch (command) {
      case 'move':
        // 移动操作由调用方处理
        break
      case 'show':
        await batchUpdateVisibility(selectedRows.value, true, onSuccess)
        break
      case 'hide':
        await batchUpdateVisibility(selectedRows.value, false, onSuccess)
        break
      case 'delete':
        await batchDelete(selectedRows.value, onSuccess)
        break
    }
  }

  return {
    selectedRows,
    moving,
    handleSelectionChange,
    handleBatchAction,
    deletePanorama,
    togglePanoramaVisibility,
    batchUpdateVisibility,
    batchDelete,
    movePanoramas
  }
}