<template>
  <div class="mouse-info">
    <div class="line">
      <span class="label">经度</span>
      <span class="value">{{ formatted.lng }}</span>
    </div>
    <div class="line">
      <span class="label">纬度</span>
      <span class="value">{{ formatted.lat }}</span>
    </div>
    <div class="line">
      <span class="label">高程</span>
      <span class="value">{{ formatted.elevation }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  state: {
    type: Object,
    default: () => ({}),
  },
});

const formatDegree = (value, axis) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const absolute = Math.abs(value);
  const suffix = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${absolute.toFixed(6)}°${suffix}`;
};

const formattedElevation = (state) => {
  if (state.isLoading && state.elevation === null) return '计算中...';
  if (!state.hasData || state.elevation === null || Number.isNaN(state.elevation)) {
    return '无覆盖数据';
  }
  return `${state.elevation} m`;
};

const formatted = computed(() => ({
  lat: formatDegree(props.state?.wgsLat ?? null, 'lat'),
  lng: formatDegree(props.state?.wgsLng ?? null, 'lng'),
  elevation: formattedElevation(props.state || {}),
}));
</script>

<style scoped lang="scss">
.mouse-info {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(6px);

  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .label {
    opacity: 0.85;
  }

  .value {
    font-family: 'Roboto Mono', 'Courier New', monospace;
  }
}
</style>
