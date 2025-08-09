<template>
  <FolderTreeView
    :folder-tree="folderTree"
    @folder-selected="handleFolderSelected"
    @create-folder="handleCreateFolder"
    @create-sub-folder="handleCreateSubFolder"
    @edit-folder="handleEditFolder"
    @toggle-visibility="handleToggleVisibility"
    @delete-folder="handleDeleteFolder"
  />
  
  <FolderEditDialog
    v-model:visible="showCreateDialog"
    :editing-folder="editingFolder"
    :flat-folders="flatFolders"
    :submitting="submitting"
    :initial-parent-id="initialParentId"
    @submit="handleFormSubmitWithReload"
    @close="handleDialogClose"
  />
</template>

<script setup>
import { onMounted } from 'vue'
import { useFolderTree } from '@/composables/useFolderTree'
import { useFolderOperations } from '@/composables/useFolderOperations'
import FolderTreeView from './FolderTree/FolderTreeView.vue'
import FolderEditDialog from './FolderTree/FolderEditDialog.vue'

const emit = defineEmits(['folder-selected', 'folder-updated'])

// 使用组合式函数
const {
  folderTree,
  flatFolders,
  loadFolders,
  handleFolderSelected: onFolderSelected,
  toggleFolderVisibility
} = useFolderTree()

const {
  showCreateDialog,
  submitting,
  editingFolder,
  initialParentId,
  handleCreateFolder,
  handleCreateSubFolder,
  handleEditFolder,
  handleFormSubmit,
  handleDialogClose,
  deleteFolder
} = useFolderOperations()

// 初始化
onMounted(() => {
  loadFolders()
})

// 事件处理
const handleFolderSelected = (folder) => {
  onFolderSelected(folder)
  emit('folder-selected', folder)
}

const handleToggleVisibility = async (folder) => {
  try {
    await toggleFolderVisibility(folder)
    await loadFolders()
    emit('folder-updated')
    
    // 通知地图刷新数据
    window.dispatchEvent(new CustomEvent('folder-visibility-changed', {
      detail: { folderId: folder.id, isVisible: !folder.is_visible }
    }))
  } catch (error) {
    // 错误已在composable中处理
  }
}

const handleDeleteFolder = async (folder) => {
  try {
    const success = await deleteFolder(folder)
    if (success) {
      await loadFolders()
      emit('folder-updated')
    }
  } catch (error) {
    // 错误已在composable中处理
  }
}

const handleFormSubmitWithReload = async (folderData) => {
  try {
    const success = await handleFormSubmit(folderData)
    if (success) {
      await loadFolders()
      emit('folder-updated')
    }
  } catch (error) {
    // 错误已在composable中处理
  }
}
</script>

<style lang="scss" scoped>
// 主组件样式已移至子组件中
</style>