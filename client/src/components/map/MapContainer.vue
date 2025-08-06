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
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useMap } from '@/composables/useMap.js'
import { useAppStore } from '@/store/app.js'

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

// 初始化地图
onMounted(() => {
  const mapInstance = initMap(
    {
      center: props.center,
      zoom: props.zoom
    },
    mapType.value // 使用 store 中的地图类型进行初始化
  )
  
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
})

// 监听全景图数据变化
watch(() => props.panoramas, (newPanoramas) => {
  clearMarkers()
  
  // 优先使用全局点位数据，如果不存在则使用props数据
  const pointsToShow = window.allPoints && window.allPoints.length > 0 ? window.allPoints : newPanoramas
  if (pointsToShow && pointsToShow.length > 0) {
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
      console.error('定位失败:', error)
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
