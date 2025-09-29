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
      @file-deleted="() => handleFileDeleted(loadFileList)"
      @move-confirm="handleMoveConfirmWithCleanup"
      @update:move-to-folder-id="moveToFolderId = $event"
      @update:action-dialogs="(v) => Object.assign(actionDialogs, v)"
      @edit-file="(file) => editFile(file)"
    />
  </div>
</template>

<script setup>
import FileManageHeader from '@/components/admin/FileManageHeader.vue';
import FileSearchBar from '@/components/admin/FileSearchBar.vue';
import FileListTable from '@/components/admin/FileListTable.vue';
import FileBatchActions from '@/components/admin/FileBatchActions.vue';
import FileUploadDialogs from '@/components/admin/FileUploadDialogs.vue';
import FileActionDialogs from '@/components/admin/FileActionDialogs.vue';
import FolderTree from '@/components/admin/FolderTree.vue';

import { useFileManagePage } from './composables/useFileManagePage.js';

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
  onRefresh,
} = useFileManagePage();
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
