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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { useMap } from '@/composables/use-map.js';
import { useAppStore } from '@/store/app.js';
let setMapInstance, setMarkersData;
let onInitialViewUpdated;
import { addStyleListener, removeStyleListener } from '@/utils/style-events.js';
// import { dlog } from '@/composables/drawing-tools/utils/debug.js'; // 已删除debug工具
import MapTypeSwitch from './MapTypeSwitch.vue';
import { useSearchMarker } from '@/composables/use-search-marker.js';
import { useInitialViewSync } from '@/composables/use-initial-view-sync.js';

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

// 全局状态管理
const appStore = useAppStore();
const mapType = computed(() => appStore.mapSettings.mapType);

const locating = ref(false);
// Debug helpers removed in cleanup

const {
  map,
  isLoading,
  initMap,
  changeMapType,
  addPanoramaMarkers,
  addPointMarkers,
  addKmlLayers,
  clearMarkers,
  clearPointMarkers,
  clearKmlLayers,
  setCenter,
  fitBounds,
  onMarkerClick,
} = useMap('map');

// 搜索标记逻辑提取为可组合函数
const { setSearchMarker, clearSearchMarker } = useSearchMarker(map);

// 样式更新处理函数
const handleStyleUpdate = (_data) => {
  // 样式已经在全局变量中更新，这里不需要额外处理
};

// 标记刷新处理函数
const handleMarkersRefresh = (_data) => {
  // 强制刷新点位（仅点位，不移除 KML 图层）
  setTimeout(() => {
    try {
      if (typeof clearPointMarkers === 'function') {
        clearPointMarkers();
      } else {
        clearMarkers();
      }
    } catch (_e) {
      clearMarkers();
    }

    // 获取当前应该显示的点位数据
    const currentPoints = window.allPoints || props.panoramas;
    if (currentPoints && currentPoints.length > 0) {
      addPointMarkers(currentPoints);
    }
  }, 50);
};

// 初始化地图
onMounted(async () => {
  const mapInstance = initMap(
    {
      center: props.center,
      zoom: props.zoom,
    },
    mapType.value // 使用 store 中的地图类型进行初始化
  );
  try {
    // dlog('[map-container] initMap returned', mapInstance);
  } catch (_e) {}

  // 设置地图实例到刷新工具
  if (mapInstance) {
    const mod = await import('@/utils/marker-refresh.js');
    try {
      // dlog('[map-container] imported marker-refresh', !!mod);
    } catch (_e) {}
    setMapInstance = mod.setMapInstance;
    setMarkersData = mod.setMarkersData;
    try {
      // dlog('[map-container] about to call setMapInstance');
    } catch (_e) {}
    // 将刷新工具所需的 clear 函数指向仅清除点位的实现，避免移除 KML 图层
    setMapInstance({
      clearMarkers: typeof clearPointMarkers === 'function' ? clearPointMarkers : clearMarkers,
      addPointMarkers,
    });
    try {
      // dlog('[map-container] setMapInstance called');
    } catch (_e) {}
  }

  // 设置标记点击事件处理函数
  const handleMarkerClick = (panorama) => {
    emit('panorama-click', panorama);
  };

  // 更新 useMap 的 onMarkerClick
  onMarkerClick.value = handleMarkerClick;

  // 添加地图点击事件
  if (mapInstance) {
    mapInstance.on('click', (e) => {
      emit('map-click', e.latlng);
    });
  }

  // 添加样式更新事件监听器
  addStyleListener('point-style-updated', handleStyleUpdate);
  addStyleListener('markers-refresh', handleMarkersRefresh);

  // 初始视图同步（事件 + localStorage）
  const { setup: setupInitialViewSync } = useInitialViewSync(setCenter);
  const cleanupInitialViewSync = setupInitialViewSync();
  // 记录用于卸载
  onInitialViewUpdated = cleanupInitialViewSync;
});

// 清理事件监听器
onUnmounted(() => {
  removeStyleListener('point-style-updated', handleStyleUpdate);
  removeStyleListener('markers-refresh', handleMarkersRefresh);
  try {
    // onInitialViewUpdated 在此处存放的是清理函数
    if (typeof onInitialViewUpdated === 'function') onInitialViewUpdated();
  } catch (e) {}
});

// 监听全景图数据变化
watch(
  () => props.panoramas,
  async (newPanoramas) => {
    // 仅清除点位，保留 KML 图层
    try {
      if (typeof clearPointMarkers === 'function') clearPointMarkers();
    } catch (e) {
      clearMarkers();
    }

    // 优先使用全局点位数据，如果不存在则使用props数据
    const pointsToShow =
      window.allPoints && window.allPoints.length > 0 ? window.allPoints : newPanoramas;
    if (pointsToShow && pointsToShow.length > 0) {
      // 存储标记数据到刷新工具
      if (!setMarkersData) {
        const mod = await import('@/utils/marker-refresh.js');
        setMarkersData = mod.setMarkersData;
      }
      setMarkersData(pointsToShow);
      addPointMarkers(pointsToShow);
    }

    // 注意：KML图层的初始化现在由useMapPage.js中的loadInitialData处理
    // 这里不再自动加载KML图层，避免重复加载
  },
  { immediate: true }
);

// 监听来自 store 的地图类型变化
watch(mapType, (newType) => {
  changeMapType(newType);
});

// 监听外部传入的 center/zoom 变化，确保在 initialView 生效后更新地图视图
watch(
  () => props.center,
  (newCenter) => {
    try {
      if (!map.value) return;
      if (!newCenter || newCenter.length !== 2) return;
      const [lat, lng] = newCenter;
      // 使用暴露的 setCenter 更新视图（保留当前缩放等级或使用传入的 props.zoom）
      setCenter(lat, lng, props.zoom);
    } catch (e) {
      // 忽略更新错误
    }
  },
  { immediate: true }
);

watch(
  () => props.zoom,
  (newZoom) => {
    try {
      if (!map.value) return;
      if (typeof newZoom !== 'number') return;
      // 将当前 center 应用新的缩放
      const [lat, lng] = props.center || [null, null];
      if (lat == null || lng == null) return;
      setCenter(lat, lng, newZoom);
    } catch (e) {}
  },
  { immediate: false }
);

// 监听全局点位数据变化
watch(
  () => window.allPoints,
  async (newPoints) => {
    if (newPoints && newPoints.length > 0) {
      // 刷新点位时仅清除点位，保留 KML 图层
      try {
        if (typeof clearPointMarkers === 'function') clearPointMarkers();
      } catch (e) {
        clearMarkers();
      }
      // 存储标记数据到刷新工具
      if (!setMarkersData) {
        const mod = await import('@/utils/marker-refresh.js');
        setMarkersData = mod.setMarkersData;
      }
      setMarkersData(newPoints);
      addPointMarkers(newPoints);
    }
  },
  { deep: true }
);

// 切换地图类型 (更新全局状态)
const handleMapTypeChange = (type) => {
  if (mapType.value === type) return;
  appStore.updateMapSettings({ mapType: type });
};

// 定位用户位置
const _locateUser = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('浏览器不支持地理定位');
    return;
  }

  locating.value = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      setCenter(latitude, longitude, 16);
      locating.value = false;
      ElMessage.success('定位成功');
    },
    (_error) => {
      locating.value = false;
      ElMessage.error('定位失败，请检查位置权限');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
};

// 适应所有标记
const _fitAllMarkers = () => {
  fitBounds();
};

// 暴露方法给父组件
defineExpose({
  setCenter,
  fitBounds,
  addPanoramaMarkers,
  addPointMarkers,
  addKmlLayers,
  clearMarkers,
  clearKmlLayers,
  setSearchMarker,
  clearSearchMarker,
  // 将底层地图实例暴露给父组件（例如 MapView -> 上层页面）
  map,
  _locateUser,
  _fitAllMarkers,
});
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
