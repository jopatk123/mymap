<template>
  <div class="panorama-manage">
    <!-- 页面头部 -->
    <PanoramaHeader
      @add-panorama="showUploadDialog = true"
      @add-video="showVideoUploadDialog = true"
      @add-kml="showKmlUploadDialog = true"
    />
    
    <div class="page-content">
      <!-- 左侧文件夹树 -->
      <div class="sidebar">
        <FolderTree
          @folder-selected="handleFolderSelected"
          @folder-updated="handleFolderUpdated"
        />
      </div>
      
      <!-- 右侧内容区 -->
      <div class="main-content">
        <!-- 面包屑导航 -->
        <div class="breadcrumb-section" v-if="selectedFolder">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>全部文件夹</el-breadcrumb-item>
            <el-breadcrumb-item
              v-for="folder in folderPath"
              :key="folder.id"
            >
              {{ folder.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <!-- 搜索和筛选 -->
        <PanoramaSearchBar
          :selected-count="selectedRows.length"
          :loading="loading"
          @search="handleSearch"
          @reset="resetSearch"
          @batch-delete="handleBatchDelete"
        />
      
        <!-- 数据表格 -->
        <div class="table-section">
          <PanoramaTable
            :panoramas="panoramas"
            :loading="loading"
            @selection-change="selectedRows = $event"
            @row-action="handleRowAction"
            @view-panorama="viewPanorama"
            @edit-panorama="editPanorama"
          />
          
          <!-- 批量操作 -->
          <PanoramaBatchActions
            v-if="selectedRows.length > 0"
            :selected-count="selectedRows.length"
            @batch-action="handleBatchAction"
          />
        
        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </div>
    </div>
    </div>
    
    <!-- 上传对话框 -->
    <UploadDialog
      v-model="showUploadDialog"
      @success="handleUploadSuccess"
    />
    
    <!-- 视频上传对话框 -->
    <VideoUploadDialog
      v-model="showVideoUploadDialog"
      @success="handleUploadSuccess"
    />
    
    <!-- KML上传对话框 -->
    <KmlUploadDialog
      v-model="showKmlUploadDialog"
      @success="handleUploadSuccess"
    />
    
    <!-- 编辑对话框 -->
    <EditDialog
      v-model="showEditDialog"
      :panorama="currentPanorama"
      @success="handleEditSuccess"
    />
    
    <!-- 查看对话框 -->
    <PanoramaModal
      v-model="showViewDialog"
      :panorama="currentPanorama"
      @panorama-deleted="handlePanoramaDeleted"
    />
    
    <!-- 移动对话框 -->
    <PanoramaMoveDialog 
      v-model="showMoveDialog" 
      :panoramas="movingPanoramas" 
      @success="handleMoveSuccess" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 组件导入
import PanoramaHeader from '@/components/admin/PanoramaHeader.vue'
import PanoramaSearchBar from '@/components/admin/PanoramaSearchBar.vue'
import PanoramaTable from '@/components/admin/PanoramaTable.vue'
import PanoramaBatchActions from '@/components/admin/PanoramaBatchActions.vue'
import PanoramaMoveDialog from '@/components/admin/PanoramaMoveDialog.vue'
import UploadDialog from '@/components/common/UploadDialog.vue'
import VideoUploadDialog from '@/components/common/VideoUploadDialog.vue'
import KmlUploadDialog from '@/components/common/KmlUploadDialog.vue'
import EditDialog from '@/components/admin/EditDialog.vue'
import PanoramaModal from '@/components/map/PanoramaModal.vue'
import FolderTree from '@/components/admin/FolderTree.vue'

// 自定义 Hooks
import { usePanoramaManagement } from '@/composables/usePanoramaManagement.js'
import { useBatchOperations } from '@/composables/useBatchOperations.js'

// 使用 Hooks
const {
  panoramas,
  loading,
  pagination,
  selectedRows,
  selectedFolder,
  folderPath,
  loadData,
  loadFolders,
  handleSearch,
  resetSearch,
  handleFolderSelected
} = usePanoramaManagement()

const {
  moving,
  deletePanorama,
  togglePanoramaVisibility,
  batchUpdateVisibility,
  batchDelete,
  movePanoramas
} = useBatchOperations()

// 对话框状态
const currentPanorama = ref(null)
const showUploadDialog = ref(false)
const showVideoUploadDialog = ref(false)
const showKmlUploadDialog = ref(false)
const showEditDialog = ref(false)
const showViewDialog = ref(false)
const showMoveDialog = ref(false)
const movingPanoramas = ref([])

// 初始化
onMounted(() => {
  loadData()
  loadFolders()
})

// 监听分页变化
watch([() => pagination.value.page, () => pagination.value.pageSize], loadData)

// 事件处理
const viewPanorama = (panorama) => {
  currentPanorama.value = panorama
  showViewDialog.value = true
}

const editPanorama = (panorama) => {
  currentPanorama.value = panorama
  showEditDialog.value = true
}

const handleRowAction = async (command, row) => {
  switch (command) {
    case 'view':
      viewPanorama(row)
      break
    case 'edit':
      editPanorama(row)
      break
    case 'toggle-visibility':
      await togglePanoramaVisibility(row, loadData)
      break
    case 'move':
      movingPanoramas.value = [row]
      showMoveDialog.value = true
      break
    case 'delete':
      await deletePanorama(row, loadData)
      break
  }
}

const handleBatchAction = async (command) => {
  switch (command) {
    case 'move':
      movingPanoramas.value = selectedRows.value
      showMoveDialog.value = true
      break
    case 'show':
      await batchUpdateVisibility(selectedRows.value, true, () => {
        selectedRows.value = []
        loadData()
      })
      break
    case 'hide':
      await batchUpdateVisibility(selectedRows.value, false, () => {
        selectedRows.value = []
        loadData()
      })
      break
    case 'delete':
      await handleBatchDelete()
      break
  }
}

const handleBatchDelete = async () => {
  await batchDelete(selectedRows.value, () => {
    selectedRows.value = []
    loadData()
  })
}

const handleMoveSuccess = () => {
  showMoveDialog.value = false
  movingPanoramas.value = []
  selectedRows.value = []
  loadData()
}

const handleUploadSuccess = async () => {
  await loadData()
}

const handleEditSuccess = async () => {
  await loadData()
}

const handlePanoramaDeleted = async () => {
  showViewDialog.value = false
  loadData()
  ElMessage.success('全景图已从列表中移除')
}

// 添加缺失的文件夹更新处理函数
const handleFolderUpdated = () => {
  // 当文件夹更新时，重新加载数据以保持同步
  loadData()
}
</script>

<style lang="scss" scoped>
.panorama-manage {
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
      }
      
      .pagination-section {
        margin-top: 24px;
        display: flex;
        justify-content: center;
      }
    }
  }
}

@media (max-width: 768px) {
  .panorama-manage {
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