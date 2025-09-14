<template>
  <div class="file-manage">
    <FileManageHeader @upload-request="handleUploadRequest" />

    <div class="page-content">
      <!-- 左侧文件夹树 -->
      <div class="sidebar">
        <FolderTree @folder-selected="handleFolderSelected" @folder-updated="handleFolderUpdated" />
      </div>

      <!-- 右侧内容区 -->
      <div class="main-content">
        <!-- 面包屑导航 -->
        <div v-if="selectedFolder" class="breadcrumb-section">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>全部文件夹</el-breadcrumb-item>
            <el-breadcrumb-item v-for="folder in folderPath" :key="folder.id">
              {{ folder.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <FileSearchBar
          :search-form="searchForm"
          :selected-count="selectedRows.length"
          :loading="loading"
          :downloading="downloading"
          @search="handleSearch"
          @refresh="onRefresh"
          @batch-delete="handleBatchActionWithMove('delete')"
          @batch-hide="handleBatchActionWithMove('hide')"
          @batch-show="handleBatchActionWithMove('show')"
          @batch-move="handleBatchActionWithMove('move')"
          @batch-download="handleBatchActionWithMove('download')"
        />

        <!-- 文件列表表格 -->
        <div class="table-section">
          <FileListTable
            :file-list="fileList"
            :loading="loading"
            :get-file-type-color="getFileTypeColor"
            :get-file-thumbnail="getFileThumbnail"
            :format-coordinate="formatCoordinate"
            :format-date="formatDate"
            @selection-change="handleSelectionChange"
            @view-file="viewFile"
            @edit-file="editFile"
            @delete-file="(file) => deleteFile(file, loadFileList)"
            @image-error="handleImageError"
          />

          <!-- 批量操作 -->
          <FileBatchActions
            v-if="selectedRows.length > 0"
            :selected-count="selectedRows.length"
            @batch-action="handleBatchActionWithMove"
          />

          <!-- 分页 -->
          <div class="pagination-section">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </div>

    <FileUploadDialogs :upload-dialogs="uploadDialogs" @upload-success="handleUploadSuccess" />

    <FileActionDialogs
      :action-dialogs="actionDialogs"
      :current-file="currentFile"
      :move-to-folder-id="moveToFolderId"
      :valid-folders="validFolders"
      :moving="moving"
      @file-updated="handleEditSuccess"
      @file-deleted="() => handleFileDeleted(loadFileList)"
      @move-confirm="handleMoveConfirmWithCleanup"
      @update:move-to-folder-id="moveToFolderId = $event"
    />
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, ref } from 'vue';
import { onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';

import { useFileManagement } from '@/composables/use-file-management';
import { useFileOperations } from '@/composables/use-file-operations';
import { useBatchOperations } from '@/composables/use-batch-operations';
import { useFolderStore } from '@/store/folder.js';

// 导入拆分后的组件
import FileManageHeader from '@/components/admin/FileManageHeader.vue';
import FileSearchBar from '@/components/admin/FileSearchBar.vue';
import FileListTable from '@/components/admin/FileListTable.vue';
import FileBatchActions from '@/components/admin/FileBatchActions.vue';
import FileUploadDialogs from '@/components/admin/FileUploadDialogs.vue';
import FileActionDialogs from '@/components/admin/FileActionDialogs.vue';
import FolderTree from '@/components/admin/FolderTree.vue';

// Store
const folderStore = useFolderStore();
const { flatFolders } = storeToRefs(folderStore);

// 使用组合式函数
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

// 下载状态
const downloading = ref(false);

// 对话框状态管理
const uploadDialogs = reactive({
  showUploadDialog: false,
  showVideoUploadDialog: false,
  showKmlUploadDialog: false,
  showPanoramaBatchUploadDialog: false,
});

// 计算属性
const folderPath = computed(() => {
  if (!selectedFolder.value) return [];
  return folderStore.getFolderPath(selectedFolder.value.id);
});

const validFolders = computed(() => {
  return flatFolders.value.filter(
    (folder) =>
      folder &&
      folder.id !== null &&
      folder.id !== undefined &&
      (typeof folder.id === 'number' || typeof folder.id === 'string')
  );
});

// 初始化
onMounted(() => {
  loadFileList();
  loadFolders();
  window.addEventListener('show-kml-files', handleShowKmlFiles);
});

onUnmounted(() => {
  window.removeEventListener('show-kml-files', handleShowKmlFiles);
});

// 加载文件夹
const loadFolders = async () => {
  try {
    await folderStore.fetchFolders();
  } catch (error) {
    ElMessage.error('加载文件夹失败: ' + (error?.message || error));
  }
};

// 文件夹更新处理
const handleFolderUpdated = () => {
  loadFileList();
};

// 上传请求处理
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

// 批量操作处理（重写以支持移动对话框）
const handleBatchActionWithMove = async (command) => {
  if (command === 'move') {
    movingFiles.value = selectedRows.value;
    actionDialogs.showMoveDialog = true;
  } else if (command === 'download') {
    await handleBatchDownload();
  } else {
    await handleBatchAction(command, () => {
      selectedRows.value = [];
      loadFileList();
    });
  }
};

// 重写移动确认以清空选择
const handleMoveConfirmWithCleanup = async () => {
  await handleMoveConfirm(() => {
    selectedRows.value = [];
    loadFileList();
    loadFolders();
  });
};

// 生成下载链接
const getFileDownloadUrl = (file) => {
  if (!file) return null;
  switch (file.fileType) {
    case 'panorama':
      return file.image_url || file.imageUrl || null;
    case 'video':
      return file.video_url || null;
    case 'kml':
      return file.file_url || file.url || file.image_url || null;
    default:
      return file.url || file.image_url || null;
  }
};

// 触发浏览器下载
const triggerDownload = (url, filename) => {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// 批量下载
const handleBatchDownload = async () => {
  if (!selectedRows.value || selectedRows.value.length === 0) return;
  try {
    downloading.value = true;
    // 逐个触发下载，避免被浏览器拦截
    selectedRows.value.forEach((file, index) => {
      const url = getFileDownloadUrl(file);
      const ext = (() => {
        if (file.fileType === 'panorama')
          return (file.file_type && file.file_type.split('/')[1]) || 'jpg';
        if (file.fileType === 'video')
          return (file.file_type && file.file_type.split('/')[1]) || 'mp4';
        if (file.fileType === 'kml') return 'kml';
        return '';
      })();
      const name = (file.title || 'file') + (ext ? `.${ext}` : '');
      setTimeout(() => triggerDownload(url, name), index * 200);
    });
  } finally {
    setTimeout(() => {
      downloading.value = false;
    }, Math.min(selectedRows.value.length * 200 + 300, 3000));
  }
};

// 上传成功
const handleUploadSuccess = async () => {
  await loadFileList();
  // 通知侧边栏KML组件刷新列表
  window.dispatchEvent(new CustomEvent('kml-files-updated'));
};

// 显示 KML 文件视图并刷新列表
// event.detail 可包含 { basemapOnly: boolean, includeBasemap: boolean }
const handleShowKmlFiles = async (event) => {
  try {
    const detail = (event && event.detail) || {};
    // 切换搜索为 KML 类型并重载
    searchForm.fileType = 'kml';
    // 透传 basemap 相关参数到 searchForm
    searchForm.basemapOnly = !!detail.basemapOnly;
    searchForm.includeBasemap = !!detail.includeBasemap;
    selectedFolder.value = null;
    pagination.page = 1;
    await loadFileList();
  } catch (error) {
    console.error('切换到KML列表失败:', error);
  }
};

// 编辑成功
const handleEditSuccess = async () => {
  await loadFileList();
};

// 刷新：重新拉取当前条件下的列表
const onRefresh = async () => {
  await loadFileList();
};
</script>

<style lang="scss" scoped>
.file-manage {
  padding: 24px;
  height: 100vh;
  display: flex;
  flex-direction: column;

  .page-content {
    flex: 1;
    display: flex;
    gap: 24px;
    overflow: hidden;

    .sidebar {
      width: 300px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .main-content {
      flex: 1;
      background: white;
      border-radius: 8px;
      padding: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .breadcrumb-section {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
      }

      .table-section {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;

        .el-table {
          flex: 1;
        }

        .pagination-section {
          margin-top: 24px;
          display: flex;
          justify-content: center;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .file-manage {
    padding: 16px;

    .page-content {
      flex-direction: column;

      .sidebar {
        width: 100%;
        height: 300px;
      }

      .main-content {
        padding: 16px;
      }
    }
  }
}
</style>
