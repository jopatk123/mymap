<template>
  <div class="panorama-manage">
    <div class="page-header">
      <h2>全景图管理</h2>
      <div class="header-actions">
        <el-button @click="showUploadDialog = true" type="primary">
          <el-icon><Plus /></el-icon>
          添加全景图
        </el-button>
      </div>
    </div>
    
    <div class="page-content">
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
          <el-form-item>
            <el-button @click="handleSearch" type="primary">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
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
          
          <el-table-column prop="title" label="标题" min-width="150" />
          
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="{ row }">
              <span class="description">{{ row.description || '暂无描述' }}</span>
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
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button @click="viewPanorama(row)" link size="small">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button @click="editPanorama(row)" link size="small">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                @click="deletePanorama(row)"
                link
                size="small"
                class="danger-button"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 批量操作 -->
        <div class="batch-actions" v-if="selectedRows.length > 0">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <el-button @click="batchDelete" type="danger" size="small">
            批量删除
          </el-button>
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
    
    <!-- 上传对话框 -->
    <UploadDialog
      v-model="showUploadDialog"
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, View, Edit, Delete } from '@element-plus/icons-vue'

import UploadDialog from '@/components/common/UploadDialog.vue'
import EditDialog from '@/components/admin/EditDialog.vue'
import PanoramaModal from '@/components/map/PanoramaModal.vue'

import { usePanoramaStore } from '@/store/panorama.js'

// Store
const panoramaStore = usePanoramaStore()
const { panoramas, loading, pagination } = storeToRefs(panoramaStore)

// 响应式数据
const searchForm = reactive({
  keyword: ''
})

const selectedRows = ref([])
const currentPanorama = ref(null)
const showUploadDialog = ref(false)
const showEditDialog = ref(false)
const showViewDialog = ref(false)

// 初始化
onMounted(() => {
  loadData()
})

// 加载数据
const loadData = async () => {
  try {
    await panoramaStore.fetchPanoramas()
  } catch (error) {
    ElMessage.error('加载数据失败: ' + error.message)
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
  panoramaStore.clearSearchParams()
  await loadData()
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
    background: white;
    border-radius: 8px;
    padding: 24px;
    
    .search-section {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    
    .table-section {
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
      
      .danger-button {
        color: $danger-color;
        
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
    }
    
    .pagination-section {
      margin-top: 24px;
      display: flex;
      justify-content: center;
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
      }
    }
  }
}
</style>