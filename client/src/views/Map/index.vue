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
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed, hidden: !panoramaListVisible }">
      <div class="sidebar-header">
        <h3>全景图列表</h3>
        <div class="header-actions">
          <el-button 
            @click="toggleSidebar" 
            link
            :icon="sidebarCollapsed ? Expand : Fold"
            :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          />
        </div>
      </div>
      
      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <!-- 搜索和筛选 -->
        <SearchFilter
          v-model="searchParams"
          @search="handleSearch"
          @sort-change="handleSortChange"
        />
        
        <!-- 全景图列表 -->
        <PanoramaList
          :panoramas="panoramas"
          :current-panorama="currentPanorama"
          :loading="loading"
          :has-more="hasMore"
          @select-panorama="selectPanorama"
          @view-panorama="viewPanorama"
          @locate-panorama="locatePanorama"
          @load-more="loadMore"
        />
      </div>
    </div>
    
    <!-- 地图控件 -->
    <MapControls
      :panorama-list-visible="panoramaListVisible"
      :loading="loading"
      :total-count="totalCount"
      :is-online="isOnline"
      @toggle-panorama-list="togglePanoramaList"
      @refresh-data="refreshData"
      @show-upload="showUploadDialog = true"
      @show-settings="showSettings = true"
    />
    
    <!-- 全景图详情模态框 -->
    <PanoramaModal
      v-model="showPanoramaModal"
      :panorama="selectedPanorama"
      @panorama-deleted="handlePanoramaDeleted"
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
import { ref, computed, onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Expand, Fold } from '@element-plus/icons-vue'

import MapContainer from '@/components/map/MapContainer.vue'
import PanoramaModal from '@/components/map/PanoramaModal.vue'
import UploadDialog from '@/components/common/UploadDialog.vue'
import SettingsDialog from '@/components/common/SettingsDialog.vue'
import PanoramaList from '@/components/map/PanoramaList.vue'
import SearchFilter from '@/components/map/SearchFilter.vue'
import MapControls from '@/components/map/MapControls.vue'

import { usePanoramaStore } from '@/store/panorama.js'
import { useAppStore } from '@/store/app.js'

// Stores
const panoramaStore = usePanoramaStore()
const appStore = useAppStore()

// Store数据
const { 
  panoramas, 
  currentPanorama, 
  pagination,
  visiblePanoramas,
  hasMore,
  loading
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
const searchParams = reactive({
  keyword: '',
  sortBy: 'createdAt'
})
const selectedPanorama = ref(null)
const showPanoramaModal = ref(false)
const showUploadDialog = ref(false)
const showSettings = ref(false)

// 计算属性
const totalCount = computed(() => pagination.value.total)

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
    // 数据加载完成后自动适应所有标记点
    setTimeout(() => {
      if (mapRef.value) {
        mapRef.value.fitBounds()
      }
    }, 500)
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
  // 可以在这里添加新增全景图的逻辑
}

// 选择全景图
const selectPanorama = (panorama) => {
  selectedPanorama.value = panorama
  panoramaStore.setCurrentPanorama(panorama)
  
  // 地图定位到该全景图（优先使用GCJ02坐标）
  if (mapRef.value) {
    const lat = panorama.gcj02Lat || panorama.lat
    const lng = panorama.gcj02Lng || panorama.lng
    mapRef.value.setCenter(lat, lng, 16)
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
    // 优先使用GCJ02坐标
    const lat = panorama.gcj02Lat || panorama.lat
    const lng = panorama.gcj02Lng || panorama.lng
    mapRef.value.setCenter(lat, lng, 18)
  }
}

// 搜索处理
const handleSearch = async (params) => {
  if (params.keyword.trim()) {
    panoramaStore.setSearchParams(params)
  } else {
    panoramaStore.clearSearchParams()
  }
  
  await panoramaStore.fetchPanoramas()
}

// 排序变化处理
const handleSortChange = async (params) => {
  panoramaStore.setSearchParams(params)
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

// 处理全景图删除
const handlePanoramaDeleted = async (deletedId) => {
  try {
    // 从store中移除已删除的全景图
    await panoramaStore.deletePanoramaAsync(deletedId)
    
    // 重新加载地图标记
    if (mapRef.value) {
      mapRef.value.clearMarkers()
      mapRef.value.addPanoramaMarkers(visiblePanoramas.value)
    }
    
    // 清空选择状态
    if (currentPanorama.value?.id === deletedId) {
      panoramaStore.setCurrentPanorama(null)
    }
    if (selectedPanorama.value?.id === deletedId) {
      selectedPanorama.value = null
    }
    
    ElMessage.success('全景图已从地图中移除')
  } catch (error) {
    console.error('删除全景图后更新失败:', error)
    ElMessage.error('更新失败，请刷新页面')
  }
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
  
  &.hidden {
    transform: translateX(-100%);
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
}



// 移动端适配
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    
    &.collapsed {
      transform: translateX(-100%);
    }
  }
}
</style>