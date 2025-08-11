<template>
  <div class="map-view">
    <MapContainer
      ref="mapRef"
      :panoramas="visiblePanoramas"
      :center="mapConfig.defaultCenter"
      :zoom="mapConfig.defaultZoom"
      @panorama-click="$emit('panorama-click', $event)"
      @map-click="$emit('map-click', $event)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapContainer from '@/components/map/MapContainer.vue'

defineProps({
  visiblePanoramas: {
    type: Array,
    required: true
  },
  mapConfig: {
    type: Object,
    required: true
  }
})

defineEmits(['panorama-click', 'map-click'])

const mapRef = ref(null)

// 暴露方法给父组件
defineExpose({
  fitBounds: () => mapRef.value?.fitBounds(),
  setCenter: (lat, lng, zoom) => mapRef.value?.setCenter(lat, lng, zoom),
  clearMarkers: () => mapRef.value?.clearMarkers(),
  addPanoramaMarkers: (panoramas) => mapRef.value?.addPanoramaMarkers(panoramas),
  addPointMarkers: (points) => mapRef.value?.addPointMarkers(points),
  addKmlLayers: (kmlFiles) => mapRef.value?.addKmlLayers(kmlFiles),
    clearKmlLayers: () => mapRef.value?.clearKmlLayers(),
    setSearchMarker: (lat, lng, label) => mapRef.value?.setSearchMarker(lat, lng, label),
    clearSearchMarker: () => mapRef.value?.clearSearchMarker()
})
</script>

<style lang="scss" scoped>
.map-view {
  flex: 1;
  position: relative;
}
</style>