import { ref, reactive, computed } from 'vue';
import { storeToRefs } from 'pinia';

export function createMapPageState({ panoramaStore, appStore }) {
  const panoramaRefs = storeToRefs(panoramaStore);
  const appRefs = storeToRefs(appStore);

  const mapRef = ref(null);
  const searchParams = reactive({
    keyword: '',
    sortBy: 'createdAt',
  });

  const selectedPanorama = ref(null);
  const selectedVideo = ref(null);
  const selectedImageSet = ref(null);
  const showPanoramaModal = ref(false);
  const showVideoModal = ref(false);
  const showImageSetViewer = ref(false);
  const showUploadDialog = ref(false);
  const showBatchUploadDialog = ref(false);
  const showPanoramaViewer = ref(false);
  const panoramaViewerLoading = ref(false);
  const autoRotating = ref(false);
  const kmlLayersVisible = ref(true);
  const markersVisible = ref(true);
  const showKmlSettings = ref(false);
  const showPointSettings = ref(false);
  const showContourDialog = ref(false);

  const totalCount = computed(() => {
    // 优先使用 window.allPoints 获取真实总数（地图标记数据源）
    if (typeof window !== 'undefined' && Array.isArray(window.allPoints)) {
      return window.allPoints.length;
    }
    return panoramaRefs.pagination.value?.total || 0;
  });

  return {
    panoramaRefs,
    appRefs,
    mapRef,
    searchParams,
    selectedPanorama,
    selectedVideo,
    selectedImageSet,
    showPanoramaModal,
    showVideoModal,
    showImageSetViewer,
    showUploadDialog,
    showBatchUploadDialog,
    showPanoramaViewer,
    panoramaViewerLoading,
    autoRotating,
    kmlLayersVisible,
    markersVisible,
    showKmlSettings,
    showPointSettings,
    showContourDialog,
    totalCount,
  };
}
