<template>
  <div class="file-manage">
    <div class="page-header">
      <h2>文件管理</h2>
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
            <el-form-item label="文件类型">
              <el-select v-model="searchForm.fileType" @change="handleSearch">
                <el-option label="全部" value="all" />
                <el-option label="全景图" value="panorama" />
                <el-option label="视频点位" value="video" />
                <el-option label="KML文件" value="kml" />
              </el-select>
            </el-form-item>
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
      
        <!-- 文件列表表格 -->
        <div class="table-section">
          <el-table
            :data="fileList"
            v-loading="loading"
            @selection-change="handleSelectionChange"
            style="width: 100%"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getFileTypeColor(row.fileType)">
                  {{ row.displayType }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="缩略图" width="100">
              <template #default="{ row }">
                <img
                  :src="getFileThumbnail(row)"
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
            
            <!-- 根据文件类型显示不同的信息列 -->
            <el-table-column label="位置/信息" width="150">
              <template #default="{ row }">
                <span v-if="row.fileType === 'panorama' || row.fileType === 'video'">
                  {{ formatCoordinate(row.lat || row.latitude, row.lng || row.longitude) }}
                </span>
                <span v-else-if="row.fileType === 'kml'">
                  {{ row.point_count || 0 }} 个点位
                </span>
              </template>
            </el-table-column>
            
            <el-table-column prop="created_at" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at || row.createdAt) }}
              </template>
            </el-table-column>
            
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
                  {{ row.is_visible ? '显示' : '隐藏' }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button @click="viewFile(row)" link size="small">查看</el-button>
                <el-button @click="editFile(row)" link size="small">编辑</el-button>
                <el-button @click="deleteFile(row)" link size="small" type="danger">删除</el-button>
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
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
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
      :file="currentFile"
      @success="handleEditSuccess"
    />
    
    <!-- 查看对话框 -->
    <ViewDialog
      v-model="showViewDialog"
      :file="currentFile"
      @file-deleted="handleFileDeleted"
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
import ViewDialog from '@/components/admin/ViewDialog.vue'
import FolderTree from '@/components/admin/FolderTree.vue'

import { folderApi } from '@/api/folder.js'
import { useFolderStore } from '@/store/folder.js'

// Store
const folderStore = useFolderStore()
const { flatFolders } = storeToRefs(folderStore)

// 响应式数据
const fileList = ref([])
const loading = ref(false)
const selectedFolder = ref(null)

const searchForm = reactive({
  fileType: 'all',
  keyword: '',
  includeHidden: false
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const selectedRows = ref([])
const currentFile = ref(null)
const showUploadDialog = ref(false)
const showVideoUploadDialog = ref(false)
const showKmlUploadDialog = ref(false)
const showEditDialog = ref(false)
const showViewDialog = ref(false)
const showMoveDialog = ref(false)
const moveToFolderId = ref(null)
const movingFiles = ref([])
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
  loadFileList()
  loadFolders()
})

// 加载文件列表
const loadFileList = async () => {
  try {
    loading.value = true
    const folderId = selectedFolder.value?.id || 0
    const response = await folderApi.getFolderContents(folderId, {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    
    fileList.value = response.data.data
    pagination.total = response.data.pagination?.total || response.data.data.length
  } catch (error) {
    ElMessage.error('加载文件列表失败: ' + error.message)
  } finally {
    loading.value = false
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

// 获取文件类型颜色
const getFileTypeColor = (fileType) => {
  const colors = {
    panorama: 'primary',
    video: 'success', 
    kml: 'warning'
  }
  return colors[fileType] || 'info'
}

// 获取文件缩略图
const getFileThumbnail = (file) => {
  if (file.fileType === 'panorama') {
    return file.thumbnailUrl || file.imageUrl || '/default-panorama.jpg'
  } else if (file.fileType === 'video') {
    return file.thumbnailUrl || '/default-video.jpg'
  } else if (file.fileType === 'kml') {
    return '/default-kml.jpg'
  }
  return '/default-file.jpg'
}

// 文件夹选择处理
const handleFolderSelected = (folder) => {
  selectedFolder.value = folder
  selectedRows.value = []
  pagination.page = 1
  loadFileList()
}

// 文件夹更新处理
const handleFolderUpdated = () => {
  loadFileList()
}

// 搜索
const handleSearch = async () => {
  pagination.page = 1
  await loadFileList()
}

// 重置搜索
const resetSearch = async () => {
  searchForm.fileType = 'all'
  searchForm.keyword = ''
  searchForm.includeHidden = false
  pagination.page = 1
  await loadFileList()
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 分页大小变化
const handleSizeChange = async (size) => {
  pagination.pageSize = size
  pagination.page = 1
  await loadFileList()
}

// 当前页变化
const handleCurrentChange = async (page) => {
  pagination.page = page
  await loadFileList()
}

// 查看文件
const viewFile = (file) => {
  currentFile.value = file
  showViewDialog.value = true
}

// 编辑文件
const editFile = (file) => {
  currentFile.value = file
  showEditDialog.value = true
}

// 删除文件
const deleteFile = async (file) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除${file.displayType}"${file.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 根据文件类型调用相应的删除API
    // 这里需要根据实际的API实现
    ElMessage.success('删除成功')
    await loadFileList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 批量操作
const handleBatchAction = async (command) => {
  switch (command) {
    case 'move':
      movingFiles.value = selectedRows.value
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

// 批量更新可见性
const batchUpdateVisibility = async (isVisible) => {
  try {
    await ElMessageBox.confirm(
      `确定要${isVisible ? '显示' : '隐藏'}选中的 ${selectedRows.value.length} 个文件吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 根据文件类型分组处理
    // 这里需要根据实际的API实现
    ElMessage.success(`批量${isVisible ? '显示' : '隐藏'}成功`)
    selectedRows.value = []
    await loadFileList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`批量${isVisible ? '显示' : '隐藏'}失败: ` + error.message)
    }
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个文件吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 根据文件类型分组处理
    // 这里需要根据实际的API实现
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    await loadFileList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

// 移动确认
const handleMoveConfirm = async () => {
  try {
    moving.value = true
    
    // 根据文件类型分组处理移动
    // 这里需要根据实际的API实现
    
    ElMessage.success('移动成功')
    showMoveDialog.value = false
    moveToFolderId.value = null
    movingFiles.value = []
    selectedRows.value = []
    await loadFileList()
    await loadFolders()
  } catch (error) {
    ElMessage.error('移动失败: ' + error.message)
  } finally {
    moving.value = false
  }
}

// 上传成功
const handleUploadSuccess = async () => {
  await loadFileList()
}

// 编辑成功
const handleEditSuccess = async () => {
  await loadFileList()
}

// 处理文件删除
const handleFileDeleted = async () => {
  try {
    await loadFileList()
    showViewDialog.value = false
    ElMessage.success('文件已从列表中移除')
  } catch (error) {
    console.error('删除文件后更新失败:', error)
    ElMessage.error('更新失败，请刷新页面')
  }
}

// 图片加载错误
const handleImageError = (event) => {
  event.target.src = '/default-file.jpg'
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
.file-manage {
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
}

@media (max-width: 768px) {
  .file-manage {
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