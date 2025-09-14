import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useFolderStore } from '@/store/folder.js';

export function useFolderOperations() {
  const folderStore = useFolderStore();

  // 响应式数据
  const showCreateDialog = ref(false);
  const submitting = ref(false);
  const editingFolder = ref(null);
  const initialParentId = ref(null);

  // 创建文件夹
  const createFolder = async (folderData) => {
    submitting.value = true;
    try {
      await folderStore.createFolder({
        name: folderData.name,
        parentId: folderData.parentId,
        isVisible: folderData.isVisible,
      });
      ElMessage.success('文件夹创建成功');
      showCreateDialog.value = false;
      return true;
    } catch (error) {
      ElMessage.error('创建文件夹失败: ' + error.message);
      throw error;
    } finally {
      submitting.value = false;
    }
  };

  // 更新文件夹
  const updateFolder = async (folderData) => {
    if (!editingFolder.value) return;

    submitting.value = true;
    try {
      await folderStore.updateFolder(editingFolder.value.id, {
        name: folderData.name,
        parentId: folderData.parentId,
        isVisible: folderData.isVisible,
      });
      ElMessage.success('文件夹更新成功');
      showCreateDialog.value = false;
      return true;
    } catch (error) {
      ElMessage.error('更新文件夹失败: ' + error.message);
      throw error;
    } finally {
      submitting.value = false;
    }
  };

  // 删除文件夹
  const deleteFolder = async (folder) => {
    try {
      await ElMessageBox.confirm(`确定要删除文件夹"${folder.name}"吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await folderStore.deleteFolder(folder.id);
      ElMessage.success('文件夹删除成功');
      return true;
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除文件夹失败: ' + error.message);
        throw error;
      }
      return false;
    }
  };

  // 处理创建文件夹
  const handleCreateFolder = () => {
    editingFolder.value = null;
    initialParentId.value = null;
    showCreateDialog.value = true;
  };

  // 处理创建子文件夹
  const handleCreateSubFolder = (parentFolder) => {
    editingFolder.value = null;
    initialParentId.value = parentFolder.id;
    showCreateDialog.value = true;
  };

  // 处理编辑文件夹
  const handleEditFolder = (folder) => {
    editingFolder.value = folder;
    initialParentId.value = null;
    showCreateDialog.value = true;
  };

  // 处理表单提交
  const handleFormSubmit = async (folderData) => {
    if (editingFolder.value) {
      return await updateFolder(folderData);
    } else {
      return await createFolder(folderData);
    }
  };

  // 处理对话框关闭
  const handleDialogClose = () => {
    editingFolder.value = null;
    initialParentId.value = null;
  };

  return {
    // 数据
    showCreateDialog,
    submitting,
    editingFolder,
    initialParentId,

    // 方法
    createFolder,
    updateFolder,
    deleteFolder,
    handleCreateFolder,
    handleCreateSubFolder,
    handleEditFolder,
    handleFormSubmit,
    handleDialogClose,
  };
}
