<template>
  <div
    v-loading="isLoading"
    class="map-container"
    element-loading-text="地图加载中..."
    element-loading-background="rgba(255, 255, 255, 0.8)"
  >
    <div id="map" class="map-view"></div>
    <!-- 地图类型切换（右上角） -->
    <MapTypeSwitch :map-type="mapType" @change="handleMapTypeChange" />
  </div>
</template>

<script setup>
import MapTypeSwitch from './MapTypeSwitch.vue';
import { useMapContainer } from '@/composables/use-map-container.js';

const props = defineProps({
  panoramas: {
    type: Array,
    default: () => [],
  },
  center: {
    type: Array,
    default: () => [39.9042, 116.4074],
  },
  zoom: {
    type: Number,
    default: 13,
  },
});

const emit = defineEmits(['panorama-click', 'map-click']);

const { mapType, isLoading, handleMapTypeChange, expose } = useMapContainer(props, emit);

defineExpose(expose);
</script>

<style lang="scss" scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;

  .map-view {
    width: 100%;
    height: 100%;
  }
}
</style>
