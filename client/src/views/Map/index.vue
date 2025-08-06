<template>
  <div class="map-page">
    <!-- 地图容器 -->
    <MapView
      ref="mapRef"
      :visible-panoramas="visiblePanoramas"
      :map-config="mapConfig"
      @panorama-click="handlePanoramaClick"
      @map-click="handleMapClick"
    />
    
    <!-- 侧边栏 -->
    <MapSidebar
      :sidebar-collapsed="sidebarCollapsed"
      :panorama-list-visible="panoramaListVisible"
      :search-params="searchParams"
      :panoramas="panoramas"
      :current-panorama="currentPanorama"
      :loading="loading"
      :has-more="hasMore"
      @toggle-sidebar="toggleSidebar"
      @update:search-params="Object.assign(searchParams, $event)"
      @search="handleSearch"

      @select-panorama="selectPanorama"
      @view-panorama="viewPanorama"
      @view-video="viewVideo"
      @locate-panorama="locatePanorama"
      @load-more="loadMore"
    />
    
    <!-- 地图控件 -->
    <MapControls
      :panorama-list-visible="panoramaListVisible"
      :kml-layers-visible="kmlLayersVisible"
      :loading="loading"
      :total-count="totalCount"
      :is-online="isOnline"
      @toggle-panorama-list="togglePanoramaList"
      @toggle-kml-layers="toggleKmlLayers"
      @show-settings="showSettings = true"
      @show-kml-settings="showKmlSettings = true"
      @show-point-settings="showPointSettings = true"
    />
    
    <!-- 对话框组 -->
    <MapDialogs
      :show-panorama-modal="showPanoramaModal"
      :selected-panorama="selectedPanorama"
      :show-upload-dialog="showUploadDialog"
      :show-settings="showSettings"
      @update:show-panorama-modal="showPanoramaModal = $event"
      @update:show-upload-dialog="showUploadDialog = $event"
      @update:show-settings="showSettings = $event"
      @panorama-deleted="handlePanoramaDeleted"
      @upload-success="handleUploadSuccess"
    />
    
    <!-- 视频模态框 -->
    <VideoModal
      v-model="showVideoModal"
      :video="selectedVideo"
      :loading="loading"
      @close="handleVideoModalClose"
    />
    
    <!-- 全景图查看器 -->
    <PanoramaViewer
      v-model:visible="showPanoramaViewer"
      :loading="panoramaViewerLoading"
      :auto-rotating="autoRotating"
      @close="closePanoramaViewer"
      @toggle-auto-rotate="toggleAutoRotate"
      @toggle-fullscreen="toggleFullscreen"
      @reset-view="resetView"
    />

    <!-- KML样式设置对话框 -->
    <KmlStyleDialog
      v-model="showKmlSettings"
      @styles-updated="handleKmlStylesUpdated"
    />

    <!-- 点位样式设置对话框 -->
    <PointStyleDialog
      v-model="showPointSettings"
      @styles-updated="handlePointStylesUpdated"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMapPage } from '@/composables/useMapPage'
import { useMapInteractions } from '@/composables/useMapInteractions'
import { usePanoramaViewer } from '@/composables/usePanoramaViewer'
import { usePointStyles } from '@/composables/usePointStyles'
import { kmlApi } from '@/api/kml.js'

import MapView from './components/MapView.vue'
import MapSidebar from './components/MapSidebar.vue'
import MapControls from '@/components/map/MapControls.vue'
import MapDialogs from './components/MapDialogs.vue'
import VideoModal from '@/components/map/VideoModal.vue'
import PanoramaViewer from '@/components/map/panorama/PanoramaViewer.vue'
import KmlStyleDialog from '@/components/map/KmlStyleDialog.vue'
import PointStyleDialog from '@/components/map/PointStyleDialog.vue'

// 使用组合式函数
const {
  // Store数据
  panoramas,
  currentPanorama,
  visiblePanoramas,
  hasMore,
  loading,
  sidebarCollapsed,
  panoramaListVisible,
  mapConfig,
  isOnline,
  totalCount,
  
  // 组件状态
  mapRef,
  searchParams,
  selectedPanorama,
  selectedVideo,
  showPanoramaModal,
  showVideoModal,
  showUploadDialog,
  showSettings,
  showPanoramaViewer,
  panoramaViewerLoading,
  autoRotating,
  kmlLayersVisible,
  showKmlSettings,
  showPointSettings,
  
  // 方法
  initializePage,
  loadInitialData,
  loadMore,
  toggleKmlLayers
} = useMapPage()

// 点位样式管理
const {
  loadAllPointStyles,
  videoPointStyles,
  panoramaPointStyles
} = usePointStyles()

// 全景图查看器相关方法
const {
  openViewer,
  closeViewer,
  toggleAutoRotate,
  toggleFullscreen,
  resetView
} = usePanoramaViewer()

const {
  handlePanoramaClick,
  handleMapClick,
  selectPanorama,
  viewPanorama,
  viewVideo,
  locatePanorama,
  handleSearch,

  toggleSidebar,
  togglePanoramaList,
  handleUploadSuccess,
  handlePanoramaDeleted
} = useMapInteractions(
  mapRef,
  selectedPanorama,
  showPanoramaModal,
  visiblePanoramas,
  currentPanorama,
  selectedVideo,
  showVideoModal,
  showPanoramaViewer,
  openViewer
)

// 视频模态框关闭处理
const handleVideoModalClose = () => {
  selectedVideo.value = null
  showVideoModal.value = false
}

// 关闭全景图查看器
const closePanoramaViewer = () => {
  closeViewer()
  showPanoramaViewer.value = false
  autoRotating.value = false
}

// 初始化
onMounted(async () => {
  // 加载点位样式配置
  await loadAllPointStyles()
  
  // 将样式配置存储到全局变量，供地图标记使用
  // 确保即使 API 调用失败，也有默认值
  window.videoPointStyles = videoPointStyles.value || {
    point_color: '#ff4757',
    point_size: 10,
    point_opacity: 1.0,
    point_icon_type: 'marker',
    point_label_size: 14,
    point_label_color: '#000000'
  }
  window.panoramaPointStyles = panoramaPointStyles.value || {
    point_color: '#2ed573',
    point_size: 10,
    point_opacity: 1.0,
    point_icon_type: 'marker',
    point_label_size: 12,
    point_label_color: '#000000'
  }
  
  console.log('点位样式配置已加载:', {
    video: window.videoPointStyles,
    panorama: window.panoramaPointStyles
  })
  
  await initializePage()
  
  // 监听文件夹可见性变化事件
  window.addEventListener('folder-visibility-changed', handleFolderVisibilityChanged)
})

// 处理文件夹可见性变化
const handleFolderVisibilityChanged = async () => {
  console.log('文件夹可见性发生变化，重新加载地图数据')
  await loadInitialData()
  
  // 重新加载数据后，如果KML图层应该显示，则重新加载KML图层
  setTimeout(() => {
    if (mapRef.value && kmlLayersVisible.value) {
      console.log('文件夹可见性变化后重新加载KML图层')
      mapRef.value.clearKmlLayers()
      if (window.allKmlFiles && window.allKmlFiles.length > 0) {
        mapRef.value.addKmlLayers(window.allKmlFiles)
      }
    }
  }, 600)
}

// 处理KML样式更新
const handleKmlStylesUpdated = async () => {
  console.log('KML样式已更新，准备重新加载图层')
  
  if (mapRef.value && kmlLayersVisible.value) {
    try {
      // 重新获取所有KML文件及其样式
      const kmlResponse = await kmlApi.getKmlFiles({
        respectFolderVisibility: true,
        _t: new Date().getTime()
      })
      
      const kmlFilesWithStyles = await Promise.all(
        (kmlResponse.data || []).map(async (file) => {
          try {
            const styleResponse = await kmlApi.getKmlFileStyles(file.id)
            file.styleConfig = styleResponse.data
          } catch (error) {
            console.warn(`加载KML文件 ${file.id} 样式失败:`, error)
            // 使用默认样式或保持为空
            file.styleConfig = null 
          }
          return file
        })
      )
      
      // 更新全局变量
      window.allKmlFiles = kmlFilesWithStyles
      
      console.log('样式更新后重新加载KML图层')
      mapRef.value.clearKmlLayers()
      mapRef.value.addKmlLayers(kmlFilesWithStyles)
      
    } catch (error) {
      console.error('重新加载KML图层失败:', error)
      ElMessage.error('重新加载KML图层失败')
    }
  }
}

// 处理点位样式更新
const handlePointStylesUpdated = async () => {
  console.log('点位样式已更新，准备重新加载地图数据')
  
  try {
    // 重新加载点位样式配置
    await loadAllPointStyles()
    
    // 更新全局变量
    // 确保即使 API 调用失败，也有默认值
    window.videoPointStyles = videoPointStyles.value || {
      point_color: '#ff4757',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 14,
      point_label_color: '#000000'
    }
      window.panoramaPointStyles = panoramaPointStyles.value || {
    point_color: '#2ed573',
    point_size: 10,
    point_opacity: 1.0,
    point_icon_type: 'marker',
    point_label_size: 12,
    point_label_color: '#000000'
  }
    
    console.log('更新后的点位样式配置:', {
      video: window.videoPointStyles,
      panorama: window.panoramaPointStyles
    })
    
    // 重新加载地图数据以应用新的样式
    await loadInitialData()
    
    ElMessage.success('点位样式已更新')
  } catch (error) {
    console.error('重新加载地图数据失败:', error)
    ElMessage.error('应用点位样式失败')
  }
}

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('folder-visibility-changed', handleFolderVisibilityChanged)
})
</script>

<style lang="scss" scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
}
</style>