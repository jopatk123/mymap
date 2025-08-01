<template>
  <div class="map-page">
    <!-- 地图容器 -->
    <MapContainer
      ref="mapRef"
      :panoramas="visiblePanoramas"
      :center="mapConfig.defaultCenter"
      :zoom="mapConfig.defaultZoom"
      @panorama-click="handlePanoramaClick"
      @map-click="handleMapClick"
    />
    
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <h3>全景图列表</h3>
        <div class="header-actions">
          <el-button 
            @click="togglePanoramaList" 
            type="text" 
            :icon="panoramaListVisible ? EyeClose : View"
            :title="panoramaListVisible ? '隐藏列表' : '显示列表'"
          />
          <el-button 
            @click="toggleSidebar" 
            type="text" 
            :icon="sidebarCollapsed ? Expand : Fold"
            :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          />
        </div>
      </div>
      
      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <!-- 搜索框 -->
        <div class="search-section">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索全景图..."
            @input="handleSearch"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <!-- 筛选选项 -->
        <div class="filter-section">
          <el-select
            v-model="sortBy"
            placeholder="排序方式"
            @change="handleSortChange"
            style="width: 100%"
          >
            <el-option label="创建时间" value="createdAt" />
            <el-option label="标题" value="title" />
            <el-option label="距离" value="distance" />
          </el-select>
        </div>
        
        <!-- 全景图列表隐藏提示 -->
        <div class="list-hidden-hint" v-show="!panoramaListVisible">
          <div class="hint-content">
            <el-icon class="hint-icon"><EyeClose /></el-icon>
            <p>全景图列表已隐藏</p>
            <el-button 
              @click="togglePanoramaList" 
              type="primary" 
              size="small"
              plain
            >
              <el-icon><View /></el-icon>
              显示列表
            </el-button>
          </div>
        </div>
        
        <!-- 全景图列表 -->
        <div class="panorama-list" v-show="panoramaListVisible">
          <div
            v-for="panorama in panoramas"
            :key="panorama.id"
            class="panorama-item"
            :class="{ active: currentPanorama?.id === panorama.id }"
            @click="selectPanorama(panorama)"
          >
            <div class="panorama-thumbnail">
              <img 
                :src="panorama.thumbnailUrl || '/default-panorama.jpg'" 
                :alt="panorama.title"
                @error="handleImageError"
              />
            </div>
            <div class="panorama-info">
              <h4>{{ panorama.title || '未命名' }}</h4>
              <p class="description">{{ panorama.description || '暂无描述' }}</p>
              <div class="meta">
                <span class="coordinate">
                  {{ formatCoordinate(panorama.lat, panorama.lng) }}
                </span>
                <span class="date">
                  {{ formatDate(panorama.createdAt) }}
                </span>
              </div>
            </div>
            <div class="panorama-actions">
              <el-button 
                @click.stop="viewPanorama(panorama)" 
                type="primary" 
                size="small"
                circle
              >
                <el-icon><View /></el-icon>
              </el-button>
              <el-button 
                @click.stop="locatePanorama(panorama)" 
                type="info" 
                size="small"
                circle
              >
                <el-icon><Location /></el-icon>
              </el-button>
            </div>
          </div>
          
          <!-- 加载更多 -->
          <div class="load-more" v-if="hasMore">
            <el-button 
              @click="loadMore" 
              :loading="loading" 
              type="text"
              style="width: 100%"
            >
              加载更多
            </el-button>
          </div>
          
          <!-- 空状态 -->
          <div class="empty-state" v-if="!loading && panoramas.length === 0">
            <el-empty description="暂无全景图数据" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button-group>
        <el-button @click="refreshData" :loading="loading" type="primary">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="showUploadDialog = true" type="success">
          <el-icon><Plus /></el-icon>
          添加
        </el-button>
        <el-button @click="showSettings = true" type="info">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
      </el-button-group>
    </div>
    
    <!-- 状态栏 -->
    <div class="status-bar">
      <span>共 {{ totalCount }} 个全景图</span>
      <span v-if="!isOnline" class="offline-indicator">离线模式</span>
    </div>
    
    <!-- 全景图详情模态框 -->
    <PanoramaModal
      v-model="showPanoramaModal"
      :panorama="selectedPanorama"
    />
    
    <!-- 上传对话框 -->
    <UploadDialog
      v-model="showUploadDialog"
      @success="handleUploadSuccess"
    />
    
    <!-- 设置对话框 -->
    <SettingsDialog
      v-model="showSettings"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { 
  Search, View, Location, Refresh, Plus, Setting, 
  Expand, Fold, EyeClose 
} from '@element-plus/icons-vue'

import MapContainer from '@/components/map/MapContainer.vue'
import PanoramaModal from '@/components/map/PanoramaModal.vue'
import UploadDialog from '@/components/common/UploadDialog.vue'
import SettingsDialog from '@/components/common/SettingsDialog.vue'

import { usePanoramaStore } from '@/store/panorama.js'
import { useAppStore } from '@/store/app.js'

// Store
const panoramaStore = usePanoramaStore()
const appStore = useAppStore()

// Store数据
const { 
  panoramas, 
  currentPanorama, 
  loading, 
  pagination,
  visiblePanoramas 
} = storeToRefs(panoramaStore)

const { 
  sidebarCollapsed, 
  panoramaListVisible,
  mapConfig, 
  isOnline 
} = storeToRefs(appStore)

// 组件引用
const mapRef = ref(null)

// 响应式数据
const searchKeyword = ref('')
const sortBy = ref('createdAt')
const selectedPanorama = ref(null)
const showPanoramaModal = ref(false)
const showUploadDialog = ref(false)
const showSettings = ref(false)

// 计算属性
const totalCount = computed(() => pagination.value.total)
const hasMore = computed(() => panoramaStore.hasMore)

// 初始化
onMounted(async () => {
  // 初始化应用
  appStore.initApp()
  
  // 加载全景图数据
  await loadInitialData()
})

// 加载初始数据
const loadInitialData = async () => {
  try {
    await panoramaStore.fetchPanoramas()
  } catch (error) {
    ElMessage.error('加载数据失败: ' + error.message)
  }
}

// 处理全景图标记点击
const handlePanoramaClick = (panorama) => {
  selectedPanorama.value = panorama
  panoramaStore.setCurrentPanorama(panorama)
  showPanoramaModal.value = true
}

// 处理地图点击
const handleMapClick = (latlng) => {
  console.log('地图点击坐标:', latlng)
  // 可以在这里添加新增全景图的逻辑
}

// 选择全景图
const selectPanorama = (panorama) => {
  selectedPanorama.value = panorama
  panoramaStore.setCurrentPanorama(panorama)
  
  // 地图定位到该全景图
  if (mapRef.value) {
    mapRef.value.setCenter(panorama.lat, panorama.lng, 16)
  }
}

// 查看全景图
const viewPanorama = (panorama) => {
  selectedPanorama.value = panorama
  showPanoramaModal.value = true
}

// 定位到全景图
const locatePanorama = (panorama) => {
  if (mapRef.value) {
    mapRef.value.setCenter(panorama.lat, panorama.lng, 18)
  }
}

// 搜索处理
const handleSearch = async () => {
  if (searchKeyword.value.trim()) {
    panoramaStore.setSearchParams({ 
      keyword: searchKeyword.value.trim() 
    })
  } else {
    panoramaStore.clearSearchParams()
  }
  
  await panoramaStore.fetchPanoramas()
}

// 排序变化处理
const handleSortChange = async () => {
  panoramaStore.setSearchParams({ 
    ...panoramaStore.searchParams,
    sortBy: sortBy.value 
  })
  
  await panoramaStore.fetchPanoramas()
}

// 刷新数据
const refreshData = async () => {
  await panoramaStore.refresh()
}

// 加载更多
const loadMore = async () => {
  await panoramaStore.loadMore()
}

// 切换侧边栏
const toggleSidebar = () => {
  appStore.toggleSidebar()
}

// 切换全景图列表显示/隐藏
const togglePanoramaList = () => {
  appStore.togglePanoramaList()
}

// 上传成功处理
const handleUploadSuccess = () => {
  refreshData()
  ElMessage.success('上传成功')
}

// 图片加载错误处理
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
  return new Date(dateString).toLocaleDateString('zh-CN')
}
</script>

<style lang="scss" scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
}

.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 350px;
  height: 100%;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  
  &.collapsed {
    transform: translateX(-310px);
  }
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      gap: 4px;
    }
  }
  
  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .search-section {
    padding: 16px;
    border-bottom: 1px solid #eee;
  }
  
  .filter-section {
    padding: 0 16px 16px;
    border-bottom: 1px solid #eee;
  }
  
  .list-hidden-hint {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    
    .hint-content {
      text-align: center;
      color: #909399;
      
      .hint-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: #c0c4cc;
      }
      
      p {
        margin: 0 0 16px;
        font-size: 14px;
      }
    }
  }
  
  .panorama-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    
    .panorama-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      border: 1px solid #eee;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #409eff;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
      }
      
      &.active {
        border-color: #409eff;
        background: rgba(64, 158, 255, 0.05);
      }
      
      .panorama-thumbnail {
        width: 60px;
        height: 60px;
        border-radius: 6px;
        overflow: hidden;
        margin-right: 12px;
        flex-shrink: 0;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      .panorama-info {
        flex: 1;
        min-width: 0;
        
        h4 {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 500;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .description {
          margin: 0 0 8px;
          font-size: 12px;
          color: #909399;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          
          span {
            font-size: 11px;
            color: #c0c4cc;
          }
        }
      }
      
      .panorama-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-left: 8px;
      }
    }
    
    .load-more {
      padding: 16px;
      text-align: center;
    }
    
    .empty-state {
      padding: 40px 16px;
      text-align: center;
    }
  }
}

.toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 12px;
  color: #666;
  z-index: 1000;
  
  .offline-indicator {
    color: #e6a23c;
    font-weight: 500;
  }
}

// 移动端适配
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    
    &.collapsed {
      transform: translateX(-100%);
    }
  }
  
  .toolbar {
    top: 10px;
    right: 10px;
    
    .el-button-group {
      flex-direction: column;
      
      .el-button {
        margin: 0 0 4px 0;
      }
    }
  }
}
</style>