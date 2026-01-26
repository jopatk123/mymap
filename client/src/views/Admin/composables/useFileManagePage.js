import { reactive, computed, onMounted, onUnmounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { storeToRefs } from 'pinia';

import { useFileManagement } from '@/composables/use-file-management';
import { useFileOperations } from '@/composables/use-file-operations';
import { useBatchOperations } from '@/composables/use-batch-operations';
import { useFolderStore } from '@/store/folder.js';
import { buildDownloadTasks, createCsvBlob } from './file-manage-downloads.js';
import { downloadImageSetAsZip, isImageSetFile } from '@/utils/image-set-downloader.js';
import { folderApi } from '@/api/folder.js';

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

function normalizeFolderContents(items) {
  return (items || []).map((item) => ({
    ...item,
    fileType: item.fileType || item.type,
    imageUrl: item.image_url || item.url || item.cover_url,
    thumbnailUrl: item.thumbnail_url,
    latitude: item.latitude || item.lat,
    longitude: item.longitude || item.lng,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    folderId: item.folder_id,
    folderName: item.folder_name,
  }));
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
    showImageSetUploadDialog: false,
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
      case 'image-set':
        uploadDialogs.showImageSetUploadDialog = true;
        break;
      case 'kml':
        uploadDialogs.showKmlUploadDialog = true;
        break;
    }
  };

  const handleBatchDownload = async () => {
    if (!selectedRows.value || selectedRows.value.length === 0) return;

    // 分离图片集和其他文件
    const imageSets = selectedRows.value.filter(isImageSetFile);
    const otherFiles = selectedRows.value.filter((f) => !isImageSetFile(f));

    try {
      downloading.value = true;

      // 处理图片集：压缩下载
      if (imageSets.length > 0) {
        for (const imageSet of imageSets) {
          try {
            ElMessage.info(`正在打包下载图片集: ${imageSet.title || '未命名'}`);
            await downloadImageSetAsZip(imageSet, (progress, total, message) => {
              // 可以在这里更新进度显示
              if (progress === 100) {
                ElMessage.success(`图片集 "${imageSet.title || '未命名'}" 下载完成`);
              }
            });
          } catch (error) {
            console.error('图片集下载失败:', error);
            ElMessage.error(`图片集 "${imageSet.title || '未命名'}" 下载失败: ${error.message}`);
          }
        }
      }

      // 处理其他文件：普通下载
      if (otherFiles.length > 0) {
        const tasks = buildDownloadTasks(otherFiles);
        if (tasks.length > 0) {
          scheduleDownloadTasks(tasks);
        }
      }
    } finally {
      const settleDelay = Math.min(selectedRows.value.length * 200 + 300, 3000);
      setTimeout(() => {
        downloading.value = false;
      }, settleDelay);
    }
  };

  const fetchAllFiles = async () => {
    const folderId = selectedFolder.value?.id || 0;
    const keyword =
      typeof searchForm.keyword === 'string' ? searchForm.keyword.trim() : searchForm.keyword;

    const response = await folderApi.getFolderContents(folderId, {
      keyword,
      includeHidden: searchForm.includeHidden,
      fileType: searchForm.fileType,
      includeSubfolders: searchForm.includeSubfolders,
      includeBasemap: searchForm.includeBasemap,
      basemapOnly: searchForm.basemapOnly,
      page: 1,
      pageSize: 1000000,
      includeAll: true,
    });

    return normalizeFolderContents(response.data || []);
  };

  const handleBatchDownloadAll = async () => {
    try {
      downloading.value = true;
      const allFiles = await fetchAllFiles();
      if (!allFiles || allFiles.length === 0) {
        ElMessage.info('暂无可下载文件');
        return;
      }

      const imageSets = allFiles.filter(isImageSetFile);
      const otherFiles = allFiles.filter((f) => !isImageSetFile(f));

      if (imageSets.length > 0) {
        for (const imageSet of imageSets) {
          try {
            ElMessage.info(`正在打包下载图片集: ${imageSet.title || '未命名'}`);
            await downloadImageSetAsZip(imageSet, (progress) => {
              if (progress === 100) {
                ElMessage.success(`图片集 "${imageSet.title || '未命名'}" 下载完成`);
              }
            });
          } catch (error) {
            console.error('图片集下载失败:', error);
            ElMessage.error(`图片集 "${imageSet.title || '未命名'}" 下载失败: ${error.message}`);
          }
        }
      }

      if (otherFiles.length > 0) {
        const tasks = buildDownloadTasks(otherFiles);
        if (tasks.length > 0) scheduleDownloadTasks(tasks);
      }
    } catch (error) {
      ElMessage.error('下载全部文件失败: ' + error.message);
    } finally {
      const settleDelay = 800;
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

  const handleBatchDownloadStatsAll = async () => {
    try {
      downloading.value = true;
      const allFiles = await fetchAllFiles();
      if (!allFiles || allFiles.length === 0) {
        ElMessage.info('暂无可下载统计数据');
        return;
      }
      const blob = createCsvBlob(allFiles);
      const url = URL.createObjectURL(blob);
      const filename = `文件统计_全部_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, '-')}.csv`;
      triggerBrowserDownload(url, filename);
      URL.revokeObjectURL(url);
    } catch (error) {
      ElMessage.error('下载全部表格统计失败: ' + error.message);
    } finally {
      setTimeout(() => {
        downloading.value = false;
      }, 300);
    }
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
    await loadFolders(); // 刷新文件夹计数
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
    handleBatchDownloadAll,
    handleBatchDownloadStatsAll,
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
