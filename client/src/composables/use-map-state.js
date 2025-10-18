import { ref } from 'vue';

export function useMapState() {
  const markers = ref([]);
  const kmlLayers = ref([]);
  const isLoading = ref(false);
  const onMarkerClick = ref(() => {});
  const markerClickDisabled = ref(false);

  return {
    markers,
    kmlLayers,
    isLoading,
    onMarkerClick,
    markerClickDisabled,
  };
}
