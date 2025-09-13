<template>
  <div class="kml-basemap-folder">
  <div class="folder-header" @click="handleHeaderClick">
      <div class="folder-info">
        <el-icon class="folder-icon">
          <FolderOpened />
        </el-icon>
        <span class="folder-name">KML底图</span>
  <!-- 文件数量显示已移除（根据要求） -->
      </div>
      
      <div class="folder-actions">
        <el-tooltip content="此文件夹用于存放KML底图文件，不可删除" placement="top">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
        </el-tooltip>
        <el-button
          class="manage-basemap-btn"
          type="primary"
          size="small"
          @click.stop="openManageBasemap"
        >
          管理底图 KML
        </el-button>
      </div>
    </div>

  <!-- 废弃：已移除空状态点位展示容器（点位通过文件详情对话框查看） -->
  <div class="kml-table-wrapper"></div>

    <!-- 文件详情对话框 -->
    <el-dialog
      v-model="detailsDialogVisible"
  :title="`KML文件详情 - ${selectedFile?.title || selectedFile?.name}`"
      width="600px"
    >
      <div v-if="selectedFile" class="file-details-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="文件名">
            {{ selectedFile.title || selectedFile.name }}
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ formatFileSize(selectedFile.file_size || selectedFile.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="点位数量">
            {{ selectedFile.point_count || selectedFile.pointsCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="上传时间">
            {{ formatDate(selectedFile.created_at || selectedFile.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="文件路径" span="2">
            {{ selectedFile.file_url || selectedFile.fileUrl || selectedFile.path || '未知' }}
          </el-descriptions-item>
        </el-descriptions>

  <!-- 点位预览 -->
  <div v-if="filePoints.length > 0" class="points-preview">
          <el-table
            :data="filePoints.slice(0, 10)"
            size="small"
            max-height="300"
          >
            <el-table-column prop="name" label="名称" width="150" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" width="120" show-overflow-tooltip />
            <el-table-column prop="latitude" label="纬度" width="100">
              <template #default="{ row }">
                {{ row.latitude?.toFixed(6) }}
              </template>
            </el-table-column>
            <el-table-column prop="longitude" label="经度" width="100">
              <template #default="{ row }">
                {{ row.longitude?.toFixed(6) }}
              </template>
            </el-table-column>
            <el-table-column prop="altitude" label="海拔" width="80">
              <template #default="{ row }">
                {{ row.altitude || 0 }}m
              </template>
            </el-table-column>
          </el-table>
          
          <div v-if="filePoints.length > 10" class="more-points-tip">
            <el-text type="info" size="small">
              仅显示前10个点位，共{{ filePoints.length }}个点位
            </el-text>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailsDialogVisible = false">关闭</el-button>
        <el-button 
          v-if="selectedFile" 
          type="primary" 
          @click="downloadFile(selectedFile)"
        >
          下载文件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderOpened,
  Document,
  InfoFilled,
  View,
  Download,
  Delete
} from '@element-plus/icons-vue'
import { useKMLBaseMap } from '@/composables/use-kml-basemap.js'
import { kmlBaseMapService } from '@/services/kml-basemap-service.js'

// 使用组合式函数
const {
  kmlFiles,
  loading,
  deleteKMLFile,
  initialize
} = useKMLBaseMap()

// 本地状态
const selectedFileId = ref(null)
const selectedFile = ref(null)
const detailsDialogVisible = ref(false)
const filePoints = ref([])

// 表格行样式
const rowClassName = ({ row }) => {
  return row.id === selectedFileId.value ? 'is-selected-row' : ''
}

// 初始化
onMounted(() => {
  initialize()
  // debug: initial kmlFiles length (suppressed)
})

// 响应外部事件，刷新 KML 列表（例如上传成功后）
const refreshHandler = () => {
  initialize()
  // debug: refresh event (suppressed)
}

window.addEventListener('kml-files-updated', refreshHandler)

onUnmounted(() => {
  window.removeEventListener('kml-files-updated', refreshHandler)
})

// 选择文件
const handleFileSelect = (file) => {
  selectedFileId.value = file.id
  // debug: selected file (suppressed)
}

// 查看文件详情
const viewFileDetails = async (file) => {
  selectedFile.value = file
  detailsDialogVisible.value = true
  
  try {
    // 加载文件的点位数据
    filePoints.value = await kmlBaseMapService.getKMLPoints(file.id)
  } catch (error) {
    ElMessage.error('加载文件点位数据失败')
    console.error(error)
  }
}

// 当选中文件变更且未加载点位时自动加载点位到空块展示区域
watch(selectedFile, async (newVal) => {
  if (!newVal) return
  if (filePoints.value && filePoints.value.length > 0) return

  try {
    filePoints.value = await kmlBaseMapService.getKMLPoints(newVal.id)
  } catch (err) {
    console.error('[kml-basemap-folder] load points for selectedFile failed', err)
  }
})

// 下载文件
const downloadFile = (file) => {
  // 创建下载链接
  const link = document.createElement('a')
  link.href = `/api/kml-basemap/${file.id}/download`
  link.download = file.title || file.name
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  ElMessage.success('文件下载已开始')
}

// 点击 header 时触发刷新（并尝试聚焦/展开）
const handleHeaderClick = async () => {
  try {
    await initialize()
  // 通知主区域显示 KML 文件列表（例如当用户在其他文件夹时点击回到KML）
  // 作为底图入口，默认只显示底图文件
  window.dispatchEvent(new CustomEvent('show-kml-files', { detail: { basemapOnly: true } }))
  } catch (error) {
    console.error('刷新KML列表失败:', error)
  }
}

// 打开管理底图快捷入口：通知主区域打开KML设置对话框
const openManageBasemap = () => {
  // show-kml-files 切换到 KML 列表并打开设置
  window.dispatchEvent(new CustomEvent('show-kml-files'))
  // 触发显示 KML 设置对话框（标记为底图模式）
  window.dispatchEvent(new CustomEvent('show-kml-settings', { detail: { basemap: true } }))
}

// 删除文件
const deleteFile = async (file) => {
  try {
    await ElMessageBox.confirm(
  `确定要删除KML文件"${file.title || file.name}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
  await deleteKMLFile(file.id, file.title || file.name)
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete file error:', error)
    }
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '日期格式错误'
  }
}
</script>

<style lang="scss" scoped>
.kml-basemap-folder {
  outline: 1px solid rgba(64,158,255,0.25);

  .folder-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #ebeef5;
    background-color: #f8f9fa;

    .folder-info {
      display: flex;
      align-items: center;
      gap: 8px;
      .folder-icon { color: #409eff; font-size: 18px; }
      .folder-name { font-weight: 500; color: #303133; }
    }

    .folder-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      .info-icon { color: #909399; cursor: help; }
    }
  }

  .kml-table-wrapper { padding: 4px 8px 8px; }

  :deep(.el-table__row.is-selected-row) {
    background-color: #ecf5ff !important;
  }

  .empty-state {
    padding: 16px 0;
    text-align: center;
  }
}

.file-details-content {
  .points-preview { margin-top: 20px; }
  .more-points-tip { text-align: center; margin-top: 8px; }
}
</style>
