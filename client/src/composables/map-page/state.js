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
  const showPanoramaModal = ref(false);
  const showVideoModal = ref(false);
  const showUploadDialog = ref(false);
  const showBatchUploadDialog = ref(false);
  const showPanoramaViewer = ref(false);
  const panoramaViewerLoading = ref(false);
  const autoRotating = ref(false);
  const kmlLayersVisible = ref(true);
  const showKmlSettings = ref(false);
  const showPointSettings = ref(false);

  const totalCount = computed(() =>
    Array.isArray(panoramaRefs.panoramas.value) ? panoramaRefs.panoramas.value.length : 0
  );

  return {
    panoramaRefs,
    appRefs,
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
    totalCount,
  };
}
