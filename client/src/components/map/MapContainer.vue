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
import { createPopupContent } from '@/composables/kml-point-renderer.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';
let setMapInstance, setMarkersData;
let onInitialViewUpdated;
import {
  addStyleListener,
  removeStyleListener,
  addRefreshListener,
  removeRefreshListener,
} from '@/utils/style-events.js';
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
  const handleMarkerClick = async (point) => {
    try {
      const isKml =
        !!point &&
        (String(point.id || '').includes('kml-') ||
          String(point.type || '').toLowerCase() === 'kml');
      if (isKml) {
        // 构造与 kml-point-renderer 一致的 feature 以生成弹窗内容
        const wgsLat =
          point.latitude != null
            ? Number(point.latitude)
            : point.lat != null
            ? Number(point.lat)
            : null;
        const wgsLng =
          point.longitude != null
            ? Number(point.longitude)
            : point.lng != null
            ? Number(point.lng)
            : null;
        const feature = {
          type: 'Feature',
          properties: {
            name: point.title || point.name || '',
            description: point.description || '',
            ...(wgsLat != null && wgsLng != null ? { wgs84_lat: wgsLat, wgs84_lng: wgsLng } : {}),
          },
          geometry: { type: 'Point', coordinates: [wgsLng, wgsLat] },
        };

        // 从全局尝试找到来源 KML 文件（用于弹窗里显示信息用，可选）
        const kmlFiles = (window && window.allKmlFiles) || [];
        const kmlFile = kmlFiles.find(
          (f) => f.id === point.fileId || f.id === point.file_id || f.name === point.sourceFile
        ) || { title: '' };

        const popupContent = createPopupContent(feature, kmlFile);

        // 在已有 marker 上打开弹窗：优先选择使用显示坐标的标记（非 kmlPane），其次已绑定 popup 的标记
        const cm = (window && window.currentMarkers) || [];
        const sameId = cm.filter((m) => m && m.id === point.id && m.marker);
        let preferred = sameId.find((m) => m.marker?.options?.pane !== 'kmlPane');
        if (!preferred)
          preferred = sameId.find(
            (m) => typeof m.marker.getPopup === 'function' && m.marker.getPopup()
          );
        if (!preferred) preferred = sameId[0];
        if (preferred && preferred.marker) {
          try {
            preferred.marker.bindPopup(popupContent);
            if (typeof preferred.marker.openPopup === 'function') {
              preferred.marker.openPopup();
            }
            // 验证是否打开失败则回退（轻量延迟）
            setTimeout(() => {
              const opened = !!(
                map.value &&
                map.value._popup &&
                map.value._popup.isOpen &&
                map.value._popup.isOpen()
              );
              if (!opened) {
                const coords = getDisplayCoordinates(point);
                if (coords && coords.length === 2) {
                  const [displayLng, displayLat] = coords;
                  L.popup()
                    .setLatLng([displayLat, displayLng])
                    .setContent(popupContent)
                    .openOn(map.value);
                }
              }
            }, 30);
            return;
          } catch (e) {
            // 回退到地图弹窗
          }
        }

        // 回退：在地图坐标上打开弹窗
        const lat = point.lat ?? point.latitude;
        const lng = point.lng ?? point.longitude;
        if (map.value && lat != null && lng != null) {
          L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map.value);
          return;
        }
        // 如果没有坐标可用，直接返回不触发全景弹窗
        return;
      }
    } catch (err) {
      // 忽略 KML 处理中的错误，继续走默认分支
    }

    // 非 KML 点位，走原有逻辑（全景/视频）
    emit('panorama-click', point);
  };

  // 更新 useMap 的 onMarkerClick
  onMarkerClick.value = handleMarkerClick;

  // 添加地图点击事件
  if (mapInstance) {
    mapInstance.on('click', (e) => {
      emit('map-click', e.latlng);
    });
  }

  // 添加事件监听器（按事件类型分别注册）
  addStyleListener(handleStyleUpdate);
  addRefreshListener(handleMarkersRefresh);

  // 初始视图同步（事件 + localStorage）
  const { setup: setupInitialViewSync } = useInitialViewSync(setCenter);
  const cleanupInitialViewSync = setupInitialViewSync();
  // 记录用于卸载
  onInitialViewUpdated = cleanupInitialViewSync;
});

// 清理事件监听器
onUnmounted(() => {
  removeStyleListener(handleStyleUpdate);
  removeRefreshListener(handleMarkersRefresh);
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
