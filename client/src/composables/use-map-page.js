import { usePanoramaStore } from '@/store/panorama.js';
import { useAppStore } from '@/store/app.js';
import { pointsApi } from '@/api/points.js';
import { kmlApi } from '@/api/kml.js';
import { createMapPageState } from './map-page/state.js';
import { createMapDataLoader } from './map-page/data-loader.js';

export function useMapPage(injected = {}) {
  const usePanoramaStoreImpl = injected.usePanoramaStore || usePanoramaStore;
  const useAppStoreImpl = injected.useAppStore || useAppStore;

  const panoramaStore = usePanoramaStoreImpl();
  const appStore = useAppStoreImpl();

  const state = createMapPageState({ panoramaStore, appStore });

  const dataLoader = createMapDataLoader({
    panoramaStore,
    appStore,
    pointsApi: injected.pointsApi || pointsApi,
    kmlApi: injected.kmlApi || kmlApi,
    windowRef: injected.window,
    message: injected.message,
    delay: injected.delay,
  });

  const initializePage = async () => {
    await dataLoader.initializePage({
      mapRef: state.mapRef,
      kmlLayersVisibleRef: state.kmlLayersVisible,
    });
  };

  const loadInitialData = async () => {
    await dataLoader.loadInitialData({
      mapRef: state.mapRef,
      kmlLayersVisibleRef: state.kmlLayersVisible,
    });
  };

  const toggleKmlLayers = () => {
    dataLoader.toggleKmlLayers({
      mapRef: state.mapRef,
      kmlLayersVisibleRef: state.kmlLayersVisible,
    });
  };

  const loadMore = async () => {
    await dataLoader.loadMore();
  };

  const openBatchUploadFromSingle = () => {
    state.showUploadDialog.value = false;
    state.showBatchUploadDialog.value = true;
  };

  const { panoramas, currentPanorama, pagination, visiblePanoramas, hasMore, loading } =
    state.panoramaRefs;
  const { sidebarCollapsed, panoramaListVisible, mapConfig, isOnline } = state.appRefs;

  void pagination;

  return {
    panoramas,
    currentPanorama,
    visiblePanoramas,
    hasMore,
    loading,
    sidebarCollapsed,
    panoramaListVisible,
    mapConfig,
    isOnline,
    totalCount: state.totalCount,

    mapRef: state.mapRef,
    searchParams: state.searchParams,
    selectedPanorama: state.selectedPanorama,
    selectedVideo: state.selectedVideo,
    selectedImageSet: state.selectedImageSet,
    showPanoramaModal: state.showPanoramaModal,
    showVideoModal: state.showVideoModal,
    showImageSetViewer: state.showImageSetViewer,
    showUploadDialog: state.showUploadDialog,
    showBatchUploadDialog: state.showBatchUploadDialog,
    showPanoramaViewer: state.showPanoramaViewer,
    panoramaViewerLoading: state.panoramaViewerLoading,
    autoRotating: state.autoRotating,
    kmlLayersVisible: state.kmlLayersVisible,
    showKmlSettings: state.showKmlSettings,
    showPointSettings: state.showPointSettings,
    showContourDialog: state.showContourDialog,

    initializePage,
    loadInitialData,
    loadMore,
    toggleKmlLayers,
    openBatchUploadFromSingle,
  };
}
