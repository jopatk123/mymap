<template>
  <div class="panorama-manage">
    <div class="page-header">
      <h2>全景图管理</h2>
      <div class="header-actions">
        <el-button @click="showUploadDialog = true" type="primary">
          <el-icon><Plus /></el-icon>
          添加全景图
        </el-button>
        <el-button @click="showVideoUploadDialog = true" type="success">
          <el-icon><VideoPlay /></el-icon>
          添加视频点位
        </el-button>
        <el-button @click="showKmlUploadDialog = true" type="warning">
          <el-icon><Document /></el-icon>
          添加KML文件
        </el-button>
      </div>
    </div>
    
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
        <div class="search-section">
          <el-form :model="searchForm" inline>
            <el-form-item label="关键词">
              <el-input
                v-model="searchForm.keyword"
                placeholder="搜索标题或描述"
                @keyup.enter="handleSearch"
                clearable
              />
            </el-form-item>
            <el-form-item label="显示隐藏">
              <el-switch
                v-model="searchForm.includeHidden"
                active-text="是"
                inactive-text="否"
                @change="handleSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button @click="handleSearch" type="primary">搜索</el-button>
              <el-button @click="resetSearch">重置</el-button>
              <el-button 
                @click="batchDelete" 
                type="danger" 
                :disabled="selectedRows.length === 0"
                :loading="loading"
              >
                <el-icon><Delete /></el-icon>
                删除{{ selectedRows.length > 0 ? ` (${selectedRows.length})` : '' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      
      <!-- 数据表格 -->
      <div class="table-section">
        <el-table
          :data="panoramas"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column label="缩略图" width="100">
            <template #default="{ row }">
              <img
                :src="row.thumbnailUrl || row.imageUrl || '/default-panorama.jpg'"
                :alt="row.title"
                class="thumbnail"
                @error="handleImageError"
              />
            </template>
          </el-table-column>
          
          <el-table-column prop="title" label="标题" min-width="150">
            <template #default="{ row }">
              <span :class="{ 'hidden-item': !row.is_visible }">
                {{ row.title }}
              </span>
            </template>
          </el-table-column>
          
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="{ row }">
              <span class="description" :class="{ 'hidden-item': !row.is_visible }">
                {{ row.description || '暂无描述' }}
              </span>
            </template>
          </el-table-column>
          
          <el-table-column prop="folder_name" label="文件夹" width="120">
            <template #default="{ row }">
              <span class="folder-name">{{ row.folder_name || '默认文件夹' }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="坐标" width="150">
            <template #default="{ row }">
              <span>{{ formatCoordinate(row.lat, row.lng) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
                {{ row.is_visible ? '显示' : '隐藏' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-dropdown @command="(command) => handleRowAction(command, row)" trigger="click">
                <el-button link size="small">
                  <el-icon><MoreFilled /></el-icon>
                  更多
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="view">
                      <el-icon><View /></el-icon>
                      查看
                    </el-dropdown-item>
                    <el-dropdown-item command="edit">
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="toggle-visibility">
                      <el-icon>
                        <View v-if="!row.is_visible" />
                        <Hide v-else />
                      </el-icon>
                      {{ row.is_visible ? '隐藏' : '显示' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="move" divided>
                      <el-icon><FolderOpened /></el-icon>
                      移动到文件夹
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <el-button @click="viewPanorama(row)" link size="small">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button @click="editPanorama(row)" link size="small">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 批量操作 -->
        <div class="batch-actions" v-if="selectedRows.length > 0">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <div class="batch-buttons">
            <el-dropdown @command="handleBatchAction" trigger="click">
              <el-button type="primary" size="small">
                批量操作
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="move">
                    <el-icon><FolderOpened /></el-icon>
                    移动到文件夹
                  </el-dropdown-item>
                  <el-dropdown-item command="show">
                    <el-icon><View /></el-icon>
                    批量显示
                  </el-dropdown-item>
                  <el-dropdown-item command="hide">
                    <el-icon><Hide /></el-icon>
                    批量隐藏
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon>
                    批量删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
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
    
    <!-- 移动到文件夹对话框 -->
    <el-dialog
      v-model="showMoveDialog"
      title="移动到文件夹"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="目标文件夹">
          <el-select
            v-model="moveToFolderId"
            placeholder="选择文件夹（留空表示移动到根目录）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="folder in validFolders"
              :key="folder.id"
              :label="folder.name || '未命名文件夹'"
              :value="folder.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showMoveDialog = false">取消</el-button>
          <el-button @click="handleMoveConfirm" type="primary" :loading="moving">
            移动
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  View, 
  Edit, 
  Delete, 
  Hide, 
  MoreFilled, 
  FolderOpened, 
  ArrowDown,
  VideoPlay,
  Document
} from '@element-plus/icons-vue'

import UploadDialog from '@/components/common/UploadDialog.vue'
import VideoUploadDialog from '@/components/common/VideoUploadDialog.vue'
import KmlUploadDialog from '@/components/common/KmlUploadDialog.vue'
import EditDialog from '@/components/admin/EditDialog.vue'
import PanoramaModal from '@/components/map/PanoramaModal.vue'
import FolderTree from '@/components/admin/FolderTree.vue'

import { usePanoramaStore } from '@/store/panorama.js'
import { useFolderStore } from '@/store/folder.js'

// Store
const panoramaStore = usePanoramaStore()
const folderStore = useFolderStore()
const { panoramas, loading, pagination } = storeToRefs(panoramaStore)
const { flatFolders } = storeToRefs(folderStore)

// 响应式数据
const searchForm = reactive({
  keyword: '',
  includeHidden: false
})

const selectedRows = ref([])
const currentPanorama = ref(null)
const showUploadDialog = ref(false)
const showVideoUploadDialog = ref(false)
const showKmlUploadDialog = ref(false)
const showEditDialog = ref(false)
const showViewDialog = ref(false)
const showMoveDialog = ref(false)
const selectedFolder = ref(null)
const moveToFolderId = ref(null)
const movingPanoramas = ref([])
const moving = ref(false)

// 计算属性
const folderPath = computed(() => {
  if (!selectedFolder.value) return []
  return folderStore.getFolderPath(selectedFolder.value.id)
})

const validFolders = computed(() => {
  return flatFolders.value.filter(folder => 
    folder && 
    folder.id !== null && 
    folder.id !== undefined &&
    (typeof folder.id === 'number' || typeof folder.id === 'string')
  )
})

// 初始化
onMounted(() => {
  loadData()
  loadFolders()
})

// 加载数据
const loadData = async () => {
  try {
    const params = {
      ...searchForm,
      folderId: selectedFolder.value?.id || null
    }
    await panoramaStore.fetchPanoramas(params)
  } catch (error) {
    ElMessage.error('加载数据失败: ' + error.message)
  }
}

// 加载文件夹
const loadFolders = async () => {
  try {
    await folderStore.fetchFolders()
  } catch (error) {
    ElMessage.error('加载文件夹失败: ' + error.message)
  }
}

// 搜索
const handleSearch = async () => {
  panoramaStore.setSearchParams(searchForm)
  await loadData()
}

// 重置搜索
const resetSearch = async () => {
  searchForm.keyword = ''
  searchForm.includeHidden = false
  panoramaStore.clearSearchParams()
  await loadData()
}

// 文件夹选择
const handleFolderSelected = (folder) => {
  selectedFolder.value = folder
  selectedRows.value = []
  loadData()
}

// 文件夹更新
const handleFolderUpdated = () => {
  loadData()
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 分页大小变化
const handleSizeChange = async (size) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  await loadData()
}

// 当前页变化
const handleCurrentChange = async (page) => {
  pagination.value.page = page
  await loadData()
}

// 监听分页变化
watch([() => pagination.value.page, () => pagination.value.pageSize], async () => {
  await loadData()
})

// 查看全景图
const viewPanorama = (panorama) => {
  currentPanorama.value = panorama
  showViewDialog.value = true
}

// 编辑全景图
const editPanorama = (panorama) => {
  currentPanorama.value = panorama
  showEditDialog.value = true
}

// 删除全景图
const deletePanorama = async (panorama) => {
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
    
    await panoramaStore.deletePanorama(panorama.id)
    ElMessage.success('删除成功')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 行操作
const handleRowAction = async (command, row) => {
  switch (command) {
    case 'view':
      viewPanorama(row)
      break
    case 'edit':
      editPanorama(row)
      break
    case 'toggle-visibility':
      await togglePanoramaVisibility(row)
      break
    case 'move':
      movingPanoramas.value = [row]
      showMoveDialog.value = true
      break
    case 'delete':
      await deletePanorama(row)
      break
  }
}

// 批量操作
const handleBatchAction = async (command) => {
  switch (command) {
    case 'move':
      movingPanoramas.value = selectedRows.value
      showMoveDialog.value = true
      break
    case 'show':
      await batchUpdateVisibility(true)
      break
    case 'hide':
      await batchUpdateVisibility(false)
      break
    case 'delete':
      await batchDelete()
      break
  }
}

// 切换全景图可见性
const togglePanoramaVisibility = async (panorama) => {
  try {
    await panoramaStore.updatePanoramaVisibility(panorama.id, !panorama.is_visible)
    ElMessage.success(`全景图已${panorama.is_visible ? '隐藏' : '显示'}`)
    await loadData()
  } catch (error) {
    ElMessage.error('更新可见性失败: ' + error.message)
  }
}

// 批量更新可见性
const batchUpdateVisibility = async (isVisible) => {
  try {
    await ElMessageBox.confirm(
      `确定要${isVisible ? '显示' : '隐藏'}选中的 ${selectedRows.value.length} 个全景图吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(row => row.id)
    await panoramaStore.batchUpdatePanoramaVisibility(ids, isVisible)
    ElMessage.success(`批量${isVisible ? '显示' : '隐藏'}成功`)
    selectedRows.value = []
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`批量${isVisible ? '显示' : '隐藏'}失败: ` + error.message)
    }
  }
}

// 移动确认
const handleMoveConfirm = async () => {
  try {
    moving.value = true
    
    const ids = movingPanoramas.value.map(p => p.id)
    // 确保 folderId 为 null 或数字
    const targetFolderId = moveToFolderId.value || null
    await panoramaStore.batchMovePanoramasToFolder(ids, targetFolderId)
    
    ElMessage.success('移动成功')
    showMoveDialog.value = false
    moveToFolderId.value = null
    movingPanoramas.value = []
    selectedRows.value = []
    await loadData()
    await loadFolders()
  } catch (error) {
    ElMessage.error('移动失败: ' + error.message)
  } finally {
    moving.value = false
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个全景图吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(row => row.id)
    await panoramaStore.batchDeletePanoramas(ids)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

// 上传成功
const handleUploadSuccess = async () => {
  await loadData()
}

// 编辑成功
const handleEditSuccess = async () => {
  await loadData()
}

// 处理全景图删除
const handlePanoramaDeleted = async (deletedId) => {
  try {
    await loadData()
    showViewDialog.value = false
    ElMessage.success('全景图已从列表中移除')
  } catch (error) {
    console.error('删除全景图后更新失败:', error)
    ElMessage.error('更新失败，请刷新页面')
  }
}

// 图片加载错误
const handleImageError = (event) => {
  event.target.src = '/default-panorama.jpg'
}

// 格式化坐标
const formatCoordinate = (lat, lng) => {
  if (!lat || !lng) return '未知位置'
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.panorama-manage {
  padding: 24px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: #303133;
    }
  }
  
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
      
      .search-section {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #eee;
      }
      .table-section {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        
        .el-table {
          flex: 1;
        }
        
        .thumbnail {
          width: 60px;
          height: 30px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #eee;
        }
        
        .description {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: #666;
        }
        
        .folder-name {
          color: #409eff;
          font-size: 12px;
        }
        
        .hidden-item {
          color: #999;
          text-decoration: line-through;
        }
        
        .danger-button {
          color: #f56c6c;
          
          &:hover {
            color: #f78989;
          }
        }
      }
      .batch-actions {
        margin: 16px 0;
        padding: 12px 16px;
        background: #f5f7fa;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        
        span {
          color: #606266;
          font-size: 14px;
        }
        
        .batch-buttons {
          display: flex;
          gap: 8px;
        }
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
    
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    
    .page-content {
      flex-direction: column;
      
      .sidebar {
        width: 100%;
        height: 300px;
      }
      
      .main-content {
        padding: 16px;
        
        .search-section {
          .el-form {
            flex-direction: column;
            
            .el-form-item {
              margin-right: 0;
              margin-bottom: 16px;
            }
          }
        }
        
        .batch-actions {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          
          .batch-buttons {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>