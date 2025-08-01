<template>
  <div class="map-container">
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
      
      <el-button @click="locateUser" :loading="locating" type="info" circle>
        <el-icon><Location /></el-icon>
      </el-button>
      
      <el-button @click="fitAllMarkers" type="success" circle>
        <el-icon><FullScreen /></el-icon>
      </el-button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="map-loading">
      <el-loading-spinner />
      <span>地图加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, FullScreen } from '@element-plus/icons-vue'
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
  clearMarkers,
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
  if (newPanoramas && newPanoramas.length > 0) {
    addPanoramaMarkers(newPanoramas)
  }
}, { immediate: true })

// 监听来自 store 的地图类型变化
watch(mapType, (newType) => {
  changeMapType(newType)
})

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
  clearMarkers
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
  
  .map-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.9);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    span {
      font-size: 14px;
      color: #666;
    }
  }
}
</style>
