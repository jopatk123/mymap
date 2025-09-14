<template>
  <div
    v-loading="isLoading"
    class="map-container"
    element-loading-text="地图加载中..."
    element-loading-background="rgba(255, 255, 255, 0.8)"
  >
    <div id="map" class="map-view"></div>

    <!-- 地图控制面板 -->
    <div class="map-controls">
      <el-button-group>
        <el-button
          :type="mapType === 'normal' ? 'primary' : ''"
          @click="handleMapTypeChange('normal')"
        >
          普通
        </el-button>
        <el-button
          :type="mapType === 'satellite' ? 'primary' : ''"
          @click="handleMapTypeChange('satellite')"
        >
          卫星
        </el-button>
      </el-button-group>
    </div>
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
import { dlog } from '@/composables/drawing-tools/utils/debug.js';

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

// 记录 map 值何时变化，便于调试暴露链路
watch(
  map,
  (_v) => {
    // map changed — intentionally no debug logging to avoid noisy console output
  },
  { immediate: true }
);

// 搜索结果临时标记
let searchMarker = null;

/**
 * setSearchMarker 支持两种调用形式：
 * 1) setSearchMarker(lat, lng, 'label')
 * 2) setSearchMarker(lat, lng, pointObject) -- pointObject 来自 KML 搜索，包含 name/description/sourceFile 等
 */
const setSearchMarker = (lat, lng, labelOrPoint = '搜索位置') => {
  if (!map.value) return;
  if (searchMarker) {
    try {
      map.value.removeLayer(searchMarker);
    } catch (_) {}
    searchMarker = null;
  }

  searchMarker = L.marker([lat, lng], {
    title: typeof labelOrPoint === 'string' ? labelOrPoint : labelOrPoint.name || '搜索位置',
  });
  searchMarker.addTo(map.value);

  // 如果第三个参数是对象，则渲染丰富弹窗内容
  if (labelOrPoint && typeof labelOrPoint === 'object') {
    const point = labelOrPoint;
    // 构造弹窗 HTML，基于用户提供的示例结构
    const name = point.name || '';
    const desc = point.description || '';
    const source = point.sourceFile || '';
    const latStr = Number(point.latitude).toFixed(6);
    const lngStr = Number(point.longitude).toFixed(6);

    // 高德和百度链接（高德使用经度,纬度，百度使用纬度,经度或使用api的location=lat,lng）
    const amapUrl = `https://uri.amap.com/marker?position=${lngStr},${latStr}&name=${encodeURIComponent(
      name
    )}`;
    const baiduUrl = `https://api.map.baidu.com/marker?location=${latStr},${lngStr}&title=${encodeURIComponent(
      name
    )}&content=${encodeURIComponent(source)}&coord_type=bd09ll&output=html`;

    const popupHtml = `
      <div style="max-width: 240px;">
        <h4 class="popup-title">${escapeHtml(name)}</h4>
        <p class="popup-meta">${escapeHtml(desc)} ${
      source ? '<span class="popup-source">[' + escapeHtml(source) + ']</span>' : ''
    }</p>
        <p class="popup-meta">经纬度(WGS84): ${latStr}, ${lngStr}</p>
        <div class="popup-actions">
          <a class="map-btn gaode" href="${amapUrl}" target="_blank" rel="noopener">在高德地图打开</a>
          <a class="map-btn baidu" href="${baiduUrl}" target="_blank" rel="noopener">在百度地图打开</a>
        </div>
      </div>
    `;

    searchMarker.bindPopup(popupHtml, { autoClose: true, closeOnClick: true }).openPopup();
  } else {
    // 简单文本弹窗
    const label =
      typeof labelOrPoint === 'string'
        ? labelOrPoint
        : (labelOrPoint && labelOrPoint.name) || '搜索位置';
    searchMarker.bindPopup(label, { autoClose: true, closeOnClick: true }).openPopup();
  }
};

// 简单的 HTML 转义，防止注入
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;',
    }[s];
  });
}

const clearSearchMarker = () => {
  if (map.value && searchMarker) {
    try {
      map.value.removeLayer(searchMarker);
    } catch (_) {}
  }
  searchMarker = null;
};

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
    dlog('[map-container] initMap returned', mapInstance);
  } catch (_e) {}

  // 设置地图实例到刷新工具
  if (mapInstance) {
    const mod = await import('@/utils/marker-refresh.js');
    try {
      dlog('[map-container] imported marker-refresh', !!mod);
    } catch (_e) {}
    setMapInstance = mod.setMapInstance;
    setMarkersData = mod.setMarkersData;
    try {
      dlog('[map-container] about to call setMapInstance');
    } catch (_e) {}
    // 将刷新工具所需的 clear 函数指向仅清除点位的实现，避免移除 KML 图层
    setMapInstance({
      clearMarkers: typeof clearPointMarkers === 'function' ? clearPointMarkers : clearMarkers,
      addPointMarkers,
    });
    try {
      dlog('[map-container] setMapInstance called');
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

  // 监听全局 initial-view 更新事件，保存后立即应用
  // 将处理器赋值到模块作用域变量，以便 onUnmounted 时能够正确引用
  onInitialViewUpdated = (e) => {
    try {
      const s = e?.detail || null;
      if (!s || !s.enabled) return;
      // s.center is [lng, lat] => convert to [lat, lng]
      const [lng, lat] = s.center || [];
      if (lat == null || lng == null) return;
      setCenter(lat, lng, s.zoom);
    } catch (_err) {}
  };
  window.addEventListener('initial-view-updated', onInitialViewUpdated);
});

// 清理事件监听器
onUnmounted(() => {
  removeStyleListener('point-style-updated', handleStyleUpdate);
  removeStyleListener('markers-refresh', handleMarkersRefresh);
  try {
    window.removeEventListener('initial-view-updated', onInitialViewUpdated);
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

  .map-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .el-button-group {
      display: flex;
    }
  }
}
</style>
