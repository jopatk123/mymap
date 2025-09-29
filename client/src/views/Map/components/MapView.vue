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
import { ref, computed } from 'vue';
import MapContainer from '@/components/map/MapContainer.vue';

defineProps({
  visiblePanoramas: {
    type: Array,
    required: true,
  },
  mapConfig: {
    type: Object,
    required: true,
  },
});

defineEmits(['panorama-click', 'map-click']);

const mapRef = ref(null);

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
  clearSearchMarker: () => mapRef.value?.clearSearchMarker(),
  // 将内部 map 实例直接暴露，便于上层组件通过 mapRef?.map 访问
  // 使用 computed 返回底层 map 对象（自动解包），避免暴露为函数或未解包的 ref
  map: computed(() => {
    const result = mapRef.value?.map;
    // dlog('MapView: computed map 计算结果:', result);
    return result;
  }),
});
</script>

<style lang="scss" scoped>
.map-view {
  flex: 1;
  position: relative;
}
</style>
