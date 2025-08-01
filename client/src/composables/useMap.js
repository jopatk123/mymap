import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import { createAMapTileLayer, createPanoramaMarker } from '@/utils/map-utils.js'

export function useMap(containerId) {
  const map = ref(null)
  const markers = ref([])
  const isLoading = ref(false)
  
  // 初始化地图
  const initMap = (options = {}) => {
    const defaultOptions = {
      center: [39.9042, 116.4074], // 北京天安门
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    }
    
    const mapOptions = { ...defaultOptions, ...options }
    
    // 创建地图实例
    map.value = L.map(containerId, mapOptions)
    
    // 添加高德地图瓦片层
    const tileLayer = createAMapTileLayer('normal')
    tileLayer.addTo(map.value)
    
    // 添加地图事件监听
    setupMapEvents()
    
    return map.value
  }
  
  // 设置地图事件
  const setupMapEvents = () => {
    if (!map.value) return
    
    // 地图点击事件
    map.value.on('click', (e) => {
      console.log('地图点击坐标:', e.latlng)
    })
    
    // 地图缩放事件
    map.value.on('zoomend', () => {
      console.log('当前缩放级别:', map.value.getZoom())
    })
    
    // 地图移动事件
    map.value.on('moveend', () => {
      console.log('地图中心:', map.value.getCenter())
    })
  }
  
  // 添加全景图标记
  const addPanoramaMarker = (panorama) => {
    if (!map.value) return null
    
    const { lat, lng, id, title } = panorama
    const marker = createPanoramaMarker([lat, lng], {
      title: title || '全景图'
    })
    
    // 添加点击事件
    marker.on('click', () => {
      onMarkerClick.value(panorama)
    })
    
    marker.addTo(map.value)
    markers.value.push({ id, marker })
    
    return marker
  }
  
  // 批量添加标记
  const addPanoramaMarkers = (panoramas) => {
    panoramas.forEach(panorama => {
      addPanoramaMarker(panorama)
    })
  }
  
  // 移除标记
  const removeMarker = (id) => {
    const markerIndex = markers.value.findIndex(m => m.id === id)
    if (markerIndex > -1) {
      const { marker } = markers.value[markerIndex]
      map.value.removeLayer(marker)
      markers.value.splice(markerIndex, 1)
    }
  }
  
  // 清除所有标记
  const clearMarkers = () => {
    markers.value.forEach(({ marker }) => {
      map.value.removeLayer(marker)
    })
    markers.value = []
  }
  
  // 标记点击事件处理
  const onMarkerClick = ref((panorama) => {
    // 这里可以触发自定义事件或调用回调
    console.log('全景图标记被点击:', panorama)
  })
  
  // 设置地图中心
  const setCenter = (lat, lng, zoom) => {
    if (!map.value) return
    map.value.setView([lat, lng], zoom || map.value.getZoom())
  }
  
  // 适应所有标记的视图
  const fitBounds = () => {
    if (!map.value || markers.value.length === 0) return
    
    const group = new L.featureGroup(markers.value.map(m => m.marker))
    map.value.fitBounds(group.getBounds(), { padding: [20, 20] })
  }
  
  // 获取当前地图边界
  const getBounds = () => {
    return map.value ? map.value.getBounds() : null
  }
  
  // 获取当前缩放级别
  const getZoom = () => {
    return map.value ? map.value.getZoom() : 0
  }
  
  // 获取当前中心点
  const getCenter = () => {
    return map.value ? map.value.getCenter() : null
  }
  
  // 销毁地图
  const destroyMap = () => {
    if (map.value) {
      map.value.remove()
      map.value = null
      markers.value = []
    }
  }
  
  // 组件卸载时清理
  onUnmounted(() => {
    destroyMap()
  })
  
  return {
    map,
    markers,
    isLoading,
    initMap,
    addPanoramaMarker,
    addPanoramaMarkers,
    removeMarker,
    clearMarkers,
    setCenter,
    fitBounds,
    getBounds,
    getZoom,
    getCenter,
    destroyMap,
    onMarkerClick
  }
}