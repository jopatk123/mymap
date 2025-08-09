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
import { computed } from 'vue'
import { useMapPage } from '@/composables/useMapPage'
import { useMapInteractions } from '@/composables/useMapInteractions'
import { usePanoramaViewer } from '@/composables/usePanoramaViewer'
import { usePointStyles } from '@/composables/usePointStyles'
import { useMapStyleUpdater } from '@/composables/useMapStyleUpdater'
import { useMapEventHandlers } from './composables/MapEventHandlers'
import { useMapInitializer } from './composables/MapInitializer'

import MapView from './components/MapView.vue'
import MapSidebar from '@/components/map/MapSidebar.vue'
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

// 样式更新器
const { updateAllMarkerStyles, isUpdating } = useMapStyleUpdater(
  computed(() => mapRef.value?.map),
  computed(() => mapRef.value?.markers || [])
)

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

// 事件处理器
const {
  handleFolderVisibilityChanged,
  handleKmlStylesUpdated,
  handlePointStylesUpdated
} = useMapEventHandlers(
  mapRef,
  kmlLayersVisible,
  loadAllPointStyles,
  videoPointStyles,
  panoramaPointStyles,
  loadInitialData
)

// 初始化器
const { initializeMap, cleanup } = useMapInitializer(
  loadAllPointStyles,
  videoPointStyles,
  panoramaPointStyles,
  initializePage,
  loadInitialData,
  handleFolderVisibilityChanged,
  handleKmlStylesUpdated,
  handlePointStylesUpdated
)

// 设置全局标记点击处理器
window.mapMarkerClickHandler = handlePanoramaClick

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

// 初始化生命周期
initializeMap()
</script>

<style lang="scss" scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
}
</style>