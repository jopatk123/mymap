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
      @locate="handleLocate"
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
      :map-instance="mapRef?.map"
      @toggle-panorama-list="togglePanoramaList"
      @toggle-kml-layers="toggleKmlLayers"
      @show-kml-settings="showKmlSettings = true"
      @show-point-settings="showPointSettings = true"
      @locate-kml-point="handleLocateKMLPoint"
      @locate-address="handleLocateAddress"
    />

    <!-- 绘图工具栏 -->
    <DrawingToolbar :map-instance="mapRef?.map" />

    <!-- 对话框组 -->
    <MapDialogs
      :show-panorama-modal="showPanoramaModal"
      :selected-panorama="selectedPanorama"
      :show-upload-dialog="showUploadDialog"
      :show-batch-upload-dialog="showBatchUploadDialog"
      @update:show-panorama-modal="showPanoramaModal = $event"
      @update:show-upload-dialog="showUploadDialog = $event"
      @update:show-batch-upload-dialog="showBatchUploadDialog = $event"
      @panorama-deleted="handlePanoramaDeleted"
      @upload-success="handleUploadSuccess"
      @open-batch-upload="openBatchUploadFromSingle()"
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
    <KmlStyleDialog v-model="showKmlSettings" @styles-updated="handleKmlStylesUpdated" />

    <!-- 点位样式设置对话框 -->
    <PointStyleDialog v-model="showPointSettings" @styles-updated="handlePointStylesUpdated" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useMapPage } from '@/composables/use-map-page';
import { useMapInteractions } from '@/composables/use-map-interactions';
import { usePanoramaViewer } from '@/composables/use-panorama-viewer';
import { usePointStyles } from '@/composables/use-point-styles';
import { useMapStyleUpdater } from '@/composables/use-map-style-updater';
import { useMapEventHandlers } from './composables/map-event-handlers';
import { useMapInitializer } from './composables/map-initializer';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';

import MapView from './components/MapView.vue';
import MapSidebar from '@/components/map/MapSidebar.vue';
import MapControls from '@/components/map/MapControls.vue';
import DrawingToolbar from '@/components/map/drawing-toolbar/DrawingToolbar.vue';
import MapDialogs from './components/MapDialogs.vue';
import VideoModal from '@/components/map/VideoModal.vue';
import PanoramaViewer from '@/components/map/panorama/PanoramaViewer.vue';
import KmlStyleDialog from '@/components/map/KmlStyleDialog.vue';
import PointStyleDialog from '@/components/map/PointStyleDialog.vue';

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
  showBatchUploadDialog,

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
  toggleKmlLayers,
  openBatchUploadFromSingle,
} = useMapPage();

// 样式更新器
const { updateAllMarkerStyles, isUpdating: _isUpdating } = useMapStyleUpdater(
  computed(() => mapRef.value?.map),
  computed(() => mapRef.value?.markers || [])
);
// mark as intentionally unused to silence no-unused-vars in some build configs
void _isUpdating;
// also mark updateAllMarkerStyles if it's only used for side-effects in certain builds
void updateAllMarkerStyles;

// 点位样式管理
const { loadAllPointStyles, videoPointStyles, panoramaPointStyles } = usePointStyles();

// 全景图查看器相关方法
const { openViewer, closeViewer, toggleAutoRotate, toggleFullscreen, resetView } =
  usePanoramaViewer();

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
  handlePanoramaDeleted,
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
);

// 事件处理器
const { handleFolderVisibilityChanged, handleKmlStylesUpdated, handlePointStylesUpdated } =
  useMapEventHandlers(
    mapRef,
    kmlLayersVisible,
    loadAllPointStyles,
    videoPointStyles,
    panoramaPointStyles,
    loadInitialData
  );

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
);
// mark cleanup as intentionally unused in some build paths
void cleanup;

// 设置全局标记点击处理器
window.mapMarkerClickHandler = handlePanoramaClick;

// 视频模态框关闭处理
const handleVideoModalClose = () => {
  selectedVideo.value = null;
  showVideoModal.value = false;
};

// 关闭全景图查看器
const closePanoramaViewer = () => {
  closeViewer();
  showPanoramaViewer.value = false;
  autoRotating.value = false;
};

// 初始化生命周期
initializeMap();

// 监听全局事件以便从侧栏快捷入口打开 KML 设置
onMounted(() => {
  window.addEventListener('show-kml-settings', () => {
    showKmlSettings.value = true;
  });
});

onUnmounted(() => {
  window.removeEventListener('show-kml-settings', () => {
    showKmlSettings.value = true;
  });
});

// 处理地址定位
const handleLocate = ({ lat, lng, tip }) => {
  // 标记并居中
  mapRef.value?.setCenter(lat, lng, 16);
  const label = tip?.name || '搜索位置';
  mapRef.value?.setSearchMarker?.(lat, lng, label);
};

// 处理KML点位定位
const handleLocateKMLPoint = ({ lat, lng, point }) => {
  // 标记并居中到KML点位（KML 搜索结果为 WGS84，需要转 GCJ-02 以适配高德瓦片）
  try {
    const coords = getDisplayCoordinates(point || { latitude: lat, longitude: lng });
    if (coords && coords.length === 2) {
      const [displayLng, displayLat] = coords; // getDisplayCoordinates 返回 [lng, lat]
      mapRef.value?.setCenter(displayLat, displayLng, 16);
      mapRef.value?.setSearchMarker?.(displayLat, displayLng, point);
      return;
    }
  } catch (_) {}

  // 回退：无可用转换时按传入值定位
  mapRef.value?.setCenter(lat, lng, 16);
  mapRef.value?.setSearchMarker?.(lat, lng, point);
};

// 处理地址定位（从搜索工具）
const handleLocateAddress = ({ lat, lng, tip }) => {
  // 标记并居中到地址
  mapRef.value?.setCenter(lat, lng, 16);
  const label = tip?.name || '搜索地址';
  mapRef.value?.setSearchMarker?.(lat, lng, label);
};

// 调试：监听 mapRef 和地图实例的变化（使用共享 dlog）
import { watch } from 'vue';
// import { dlog } from '@/composables/drawing-tools/utils/debug.js'; // 已删除debug工具

watch(
  () => mapRef.value,
  (newMapRef) => {
    // dlog('主视图: mapRef 变化:', newMapRef);
  },
  { immediate: true }
);

watch(
  () => mapRef.value?.map,
  (newMap) => {
    // dlog('主视图: mapRef.map 变化:', newMap);
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
}
</style>
