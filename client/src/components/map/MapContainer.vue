<template>
  <div
    class="map-container"
    v-loading="isLoading"
    element-loading-text="地图加载中..."
    element-loading-background="rgba(255, 255, 255, 0.8)"
  >
    <div id="map" class="map-view"></div>
    
    <!-- 地图控制面板 -->
    <div class="map-controls">
      <el-button-group>
        <el-button @click="handleMapTypeChange('normal')" :type="mapType === 'normal' ? 'primary' : ''">
          普通
        </el-button>
        <el-button @click="handleMapTypeChange('satellite')" :type="mapType === 'satellite' ? 'primary' : ''">
          卫星
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useMap } from '@/composables/use-map.js'
import { useAppStore } from '@/store/app.js'
import { setMapInstance, setMarkersData } from '@/utils/marker-refresh.js'
import { addStyleListener, removeStyleListener } from '@/utils/style-events.js'

const props = defineProps({
  panoramas: {
    type: Array,
    default: () => []
  },
  center: {
    type: Array,
    default: () => [39.9042, 116.4074]
  },
  zoom: {
    type: Number,
    default: 13
  }
})

const emit = defineEmits(['panorama-click', 'map-click'])

// 全局状态管理
const appStore = useAppStore()
const mapType = computed(() => appStore.mapSettings.mapType)

const locating = ref(false)

const {
  map,
  isLoading,
  initMap,
  changeMapType,
  addPanoramaMarkers,
  addPointMarkers,
  addKmlLayers,
  clearMarkers,
  clearKmlLayers,
  setCenter,
  fitBounds,
  onMarkerClick
} = useMap('map')

// 样式更新处理函数
const handleStyleUpdate = (data) => {
  // 样式已经在全局变量中更新，这里不需要额外处理
}

// 标记刷新处理函数
const handleMarkersRefresh = (data) => {
  // 强制刷新所有标记
  setTimeout(() => {
    clearMarkers()
    
    // 获取当前应该显示的点位数据
    const currentPoints = window.allPoints || props.panoramas
    if (currentPoints && currentPoints.length > 0) {
      addPointMarkers(currentPoints)
    }
  }, 50)
}

// 初始化地图
onMounted(() => {
  const mapInstance = initMap(
    {
      center: props.center,
      zoom: props.zoom
    },
    mapType.value // 使用 store 中的地图类型进行初始化
  )
  
  // 设置地图实例到刷新工具
  if (mapInstance) {
    setMapInstance({
      clearMarkers,
      addPointMarkers
    })
  }
  
  // 设置标记点击事件处理函数
  const handleMarkerClick = (panorama) => {
    emit('panorama-click', panorama)
  }
  
  // 更新 useMap 的 onMarkerClick
  onMarkerClick.value = handleMarkerClick
  
  // 添加地图点击事件
  if (mapInstance) {
    mapInstance.on('click', (e) => {
      emit('map-click', e.latlng)
    })
  }
  
  // 添加样式更新事件监听器
  addStyleListener('point-style-updated', handleStyleUpdate)
  addStyleListener('markers-refresh', handleMarkersRefresh)
})

// 清理事件监听器
onUnmounted(() => {
  removeStyleListener('point-style-updated', handleStyleUpdate)
  removeStyleListener('markers-refresh', handleMarkersRefresh)
})

// 监听全景图数据变化
watch(() => props.panoramas, (newPanoramas) => {
  clearMarkers()
  
  // 优先使用全局点位数据，如果不存在则使用props数据
  const pointsToShow = window.allPoints && window.allPoints.length > 0 ? window.allPoints : newPanoramas
  if (pointsToShow && pointsToShow.length > 0) {
    // 存储标记数据到刷新工具
    setMarkersData(pointsToShow)
    addPointMarkers(pointsToShow)
  }
  
  // 注意：KML图层的初始化现在由useMapPage.js中的loadInitialData处理
  // 这里不再自动加载KML图层，避免重复加载
}, { immediate: true })

// 监听来自 store 的地图类型变化
watch(mapType, (newType) => {
  changeMapType(newType)
})

// 监听全局点位数据变化
watch(() => window.allPoints, (newPoints) => {
  if (newPoints && newPoints.length > 0) {
    clearMarkers()
    // 存储标记数据到刷新工具
    setMarkersData(newPoints)
    addPointMarkers(newPoints)
  }
}, { deep: true })

// 切换地图类型 (更新全局状态)
const handleMapTypeChange = (type) => {
  if (mapType.value === type) return
  appStore.updateMapSettings({ mapType: type })
}

// 定位用户位置
const locateUser = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('浏览器不支持地理定位')
    return
  }
  
  locating.value = true
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      setCenter(latitude, longitude, 16)
      locating.value = false
      ElMessage.success('定位成功')
    },
    (error) => {
      locating.value = false
      ElMessage.error('定位失败，请检查位置权限')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  )
}

// 适应所有标记
const fitAllMarkers = () => {
  fitBounds()
}

// 暴露方法给父组件
defineExpose({
  setCenter,
  fitBounds,
  addPanoramaMarkers,
  addPointMarkers,
  addKmlLayers,
  clearMarkers,
  clearKmlLayers
})
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
