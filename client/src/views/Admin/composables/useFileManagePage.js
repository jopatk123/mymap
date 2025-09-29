import { reactive, computed, onMounted, onUnmounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';

import { useFileManagement } from '@/composables/use-file-management';
import { useFileOperations } from '@/composables/use-file-operations';
import { useBatchOperations } from '@/composables/use-batch-operations';
import { useFolderStore } from '@/store/folder.js';
import { buildDownloadTasks, createCsvBlob } from './file-manage-downloads.js';

function triggerBrowserDownload(url, filename) {
  const anchor = document.createElement('a');
  anchor.href = url;
  if (filename) anchor.download = filename;
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function scheduleDownloadTasks(tasks) {
  tasks.forEach((task, index) => {
    const delay = index * 200;
    setTimeout(() => {
      triggerBrowserDownload(task.url, task.filename);
    }, delay);
  });
}

export function useFileManagePage() {
  const folderStore = useFolderStore();
  const { flatFolders } = storeToRefs(folderStore);

  const {
    fileList,
    loading,
    selectedFolder,
    searchForm,
    pagination,
    loadFileList,
    handleSearch,
    resetSearch,
    handleSizeChange,
    handleCurrentChange,
    handleFolderSelected,
    getFileTypeColor,
    getFileThumbnail,
    formatCoordinate,
    formatDate,
  } = useFileManagement();

  const {
    currentFile,
    dialogStates: actionDialogs,
    moveToFolderId,
    movingFiles,
    moving,
    viewFile,
    editFile,
    deleteFile,
    handleMoveConfirm,
    handleFileDeleted,
    handleImageError,
  } = useFileOperations();

  const { selectedRows, handleSelectionChange, handleBatchAction } = useBatchOperations();

  const downloading = ref(false);

  const uploadDialogs = reactive({
    showUploadDialog: false,
    showVideoUploadDialog: false,
    showKmlUploadDialog: false,
    showPanoramaBatchUploadDialog: false,
  });

  const folderPath = computed(() => {
    if (!selectedFolder.value) return [];
    return folderStore.getFolderPath(selectedFolder.value.id);
  });

  const validFolders = computed(() => {
    return flatFolders.value.filter((folder) => {
      return (
        folder &&
        folder.id !== null &&
        folder.id !== undefined &&
        (typeof folder.id === 'number' || typeof folder.id === 'string')
      );
    });
  });

  const loadFolders = async () => {
    try {
      await folderStore.fetchFolders();
    } catch (error) {
      ElMessage.error('加载文件夹失败: ' + (error?.message || error));
    }
  };

  const handleFolderUpdated = () => {
    loadFileList();
  };

  const handleUploadRequest = (type) => {
    switch (type) {
      case 'panorama':
        uploadDialogs.showUploadDialog = true;
        break;
      case 'video':
        uploadDialogs.showVideoUploadDialog = true;
        break;
      case 'kml':
        uploadDialogs.showKmlUploadDialog = true;
        break;
    }
  };

  const handleBatchDownload = async () => {
    if (!selectedRows.value || selectedRows.value.length === 0) return;

    const tasks = buildDownloadTasks(selectedRows.value);
    if (tasks.length === 0) return;

    try {
      downloading.value = true;
      scheduleDownloadTasks(tasks);
    } finally {
      const settleDelay = Math.min(tasks.length * 200 + 300, 3000);
      setTimeout(() => {
        downloading.value = false;
      }, settleDelay);
    }
  };

  const handleBatchDownloadStats = () => {
    if (!selectedRows.value || selectedRows.value.length === 0) return;

    const blob = createCsvBlob(selectedRows.value);
    const url = URL.createObjectURL(blob);
    const filename = `文件统计_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    triggerBrowserDownload(url, filename);
    URL.revokeObjectURL(url);
  };

  const handleBatchActionWithMove = async (command) => {
    if (command === 'move') {
      movingFiles.value = selectedRows.value.slice();
      actionDialogs.showMoveDialog = true;
      return;
    }

    if (command === 'download') {
      await handleBatchDownload();
      return;
    }

    await handleBatchAction(command, () => {
      selectedRows.value = [];
      loadFileList();
    });
  };

  const handleMoveConfirmWithCleanup = async () => {
    await handleMoveConfirm(() => {
      selectedRows.value = [];
      loadFileList();
      loadFolders();
    });
  };

  const handleUploadSuccess = async () => {
    await loadFileList();
    window.dispatchEvent(new CustomEvent('kml-files-updated'));
  };

  const handleShowKmlFiles = async (event) => {
    try {
      const detail = (event && event.detail) || {};
      searchForm.fileType = 'kml';
      searchForm.basemapOnly = !!detail.basemapOnly;
      searchForm.includeBasemap = !!detail.includeBasemap;
      selectedFolder.value = null;
      pagination.page = 1;
      await loadFileList();
    } catch (error) {
      void console.error('切换到KML列表失败:', error);
    }
  };

  const handleEditSuccess = async () => {
    await loadFileList();
  };

  const onRefresh = async () => {
    await loadFileList();
  };

  onMounted(() => {
    loadFileList();
    loadFolders();
    window.addEventListener('show-kml-files', handleShowKmlFiles);
  });

  onUnmounted(() => {
    window.removeEventListener('show-kml-files', handleShowKmlFiles);
  });

  return {
    // 来自 useFileManagement
    fileList,
    loading,
    selectedFolder,
    searchForm,
    pagination,
    loadFileList,
    handleSearch,
    resetSearch,
    handleSizeChange,
    handleCurrentChange,
    handleFolderSelected,
    getFileTypeColor,
    getFileThumbnail,
    formatCoordinate,
    formatDate,

    // 文件/文件夹状态
    folderPath,
    validFolders,
    handleFolderUpdated,
    loadFolders,

    // 上传/批量操作
    uploadDialogs,
    handleUploadRequest,
    selectedRows,
    handleSelectionChange,
    handleBatchActionWithMove,
    handleBatchDownloadStats,
    downloading,

    // 文件操作（来自 useFileOperations）
    currentFile,
    actionDialogs,
    moveToFolderId,
    movingFiles,
    moving,
    viewFile,
    editFile,
    deleteFile,
    handleMoveConfirmWithCleanup,
    handleFileDeleted,
    handleImageError,
    handleUploadSuccess,
    handleEditSuccess,

    // 其他
    handleShowKmlFiles,
    onRefresh,
  };
}
