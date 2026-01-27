<template>
  <div class="file-manage" :class="{ 'mobile-view': isMobile }">
    <FileManageHeader @upload-request="handleUploadRequest" />

    <!-- 移动端文件夹按钮 -->
    <div v-if="isMobile" class="mobile-folder-trigger">
      <el-button type="primary" plain @click="showMobileSidebar = true">
        <el-icon><Folder /></el-icon>
        {{ selectedFolder?.name || '选择文件夹' }}
      </el-button>
    </div>

    <!-- 移动端侧边栏抽屉 -->
    <el-drawer
      v-if="isMobile"
      v-model="showMobileSidebar"
      title="文件夹管理"
      direction="ltr"
      size="85%"
      :with-header="true"
    >
      <FolderTree 
        @folder-selected="handleMobileFolderSelected" 
        @folder-updated="handleFolderUpdated" 
      />
    </el-drawer>

    <div class="page-content">
      <!-- 左侧文件夹树（桌面端） -->
      <div v-if="!isMobile" class="sidebar">
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
          v-model:search-form="searchForm"
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
          @batch-download-stats="handleBatchDownloadStats"
          @batch-download-all="handleBatchDownloadAll"
          @batch-download-stats-all="handleBatchDownloadStatsAll"
        />

        <!-- 文件列表表格/卡片 -->
        <div class="table-section">
          <FileListTable
            :file-list="fileList"
            :loading="loading"
            :get-file-type-color="getFileTypeColor"
            :get-file-thumbnail="getFileThumbnail"
            :format-coordinate="formatCoordinate"
            :format-date="formatDate"
            :is-mobile="isMobile"
            @selection-change="handleSelectionChange"
            @view-file="viewFile"
            @edit-file="editFile"
            @delete-file="(file) => deleteFile(file, handleDeleteSuccess)"
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

    <FileUploadDialogs
      :upload-dialogs="uploadDialogs"
      @upload-success="handleUploadSuccess"
      @update:upload-dialogs="(v) => Object.assign(uploadDialogs, v)"
    />

    <FileActionDialogs
      :action-dialogs="actionDialogs"
      :current-file="currentFile"
      :move-to-folder-id="moveToFolderId"
      :valid-folders="validFolders"
      :moving="moving"
      @file-updated="handleEditSuccess"
      @file-deleted="() => handleFileDeleted(handleDeleteSuccess)"
      @move-confirm="handleMoveConfirmWithCleanup"
      @update:move-to-folder-id="moveToFolderId = $event"
      @update:action-dialogs="(v) => Object.assign(actionDialogs, v)"
      @edit-file="(file) => editFile(file)"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Folder } from '@element-plus/icons-vue';
import FileManageHeader from '@/components/admin/FileManageHeader.vue';
import FileSearchBar from '@/components/admin/FileSearchBar.vue';
import FileListTable from '@/components/admin/FileListTable.vue';
import FileBatchActions from '@/components/admin/FileBatchActions.vue';
import FileUploadDialogs from '@/components/admin/FileUploadDialogs.vue';
import FileActionDialogs from '@/components/admin/FileActionDialogs.vue';
import FolderTree from '@/components/admin/FolderTree.vue';

import { useFileManagePage } from './composables/useFileManagePage.js';

// 移动端检测
const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value <= 768);
const showMobileSidebar = ref(false);

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const {
  fileList,
  loading,
  selectedFolder,
  searchForm,
  pagination,
  loadFileList,
  handleSearch,
  handleSizeChange,
  handleCurrentChange,
  handleFolderSelected,
  getFileTypeColor,
  getFileThumbnail,
  formatCoordinate,
  formatDate,
  folderPath,
  validFolders,
  handleFolderUpdated,
  uploadDialogs,
  handleUploadRequest,
  selectedRows,
  handleSelectionChange,
  handleBatchActionWithMove,
  handleBatchDownloadStats,
  handleBatchDownloadAll,
  handleBatchDownloadStatsAll,
  downloading,
  currentFile,
  actionDialogs,
  moveToFolderId,
  moving,
  viewFile,
  editFile,
  deleteFile,
  handleMoveConfirmWithCleanup,
  handleFileDeleted,
  handleImageError,
  handleUploadSuccess,
  handleEditSuccess,
  handleDeleteSuccess,
  onRefresh,
} = useFileManagePage();

// 移动端文件夹选择处理
const handleMobileFolderSelected = (folder) => {
  handleFolderSelected(folder);
  showMobileSidebar.value = false;
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
    padding: 8px;
    height: auto;
    min-height: 100vh;

    .mobile-folder-trigger {
      margin-bottom: 8px;

      .el-button {
        width: 100%;
        justify-content: flex-start;
      }
    }

    .page-content {
      flex-direction: column;
      gap: 0;
      overflow: visible;

      .sidebar {
        display: none;
      }

      .main-content {
        padding: 8px;
        border-radius: 8px;
        overflow: visible;

        .breadcrumb-section {
          margin-bottom: 8px;
          padding-bottom: 4px;

          .el-breadcrumb {
            font-size: 12px;
          }
        }

        .table-section {
          overflow: visible;
          .pagination-section {
            margin-top: 16px;

            .el-pagination {
              flex-wrap: wrap;
              justify-content: center;
              gap: 8px;

              :deep(.el-pagination__sizes),
              :deep(.el-pagination__jump) {
                display: none;
              }
            }
          }
        }
      }
    }
  }
}

// 移动端抽屉样式
:deep(.el-drawer) {
  .el-drawer__body {
    padding: 0;
  }
}
</style>
