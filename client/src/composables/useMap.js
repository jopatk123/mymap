import { ref, onUnmounted } from 'vue'
import L from 'leaflet'
import { createAMapTileLayer, createPointMarker } from '@/utils/map-utils.js'

export function useMap(containerId) {
  const map = ref(null)
  const markers = ref([])
  const isLoading = ref(false)
  const tileLayer = ref(null)
  
  // 初始化地图
  const initMap = (options = {}, initialMapType = 'satellite') => {
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
    tileLayer.value = createAMapTileLayer(initialMapType)
    tileLayer.value.addTo(map.value)
    
    // 添加地图事件监听
    setupMapEvents()
    
    return map.value
  }
  
  // 切换地图类型
  const changeMapType = (type) => {
    if (!map.value) return
    
    // 移除旧图层
    if (tileLayer.value) {
      map.value.removeLayer(tileLayer.value)
    }
    
    // 添加新图层
    tileLayer.value = createAMapTileLayer(type)
    tileLayer.value.addTo(map.value)
  }

  // 设置地图事件
  const setupMapEvents = () => {
    if (!map.value) return
    
    // 地图点击事件
    map.value.on('click', (e) => {
    })
    
    // 地图缩放事件
    map.value.on('zoomend', () => {
    })
    
    // 地图移动事件
    map.value.on('moveend', () => {
    })
  }
  
  // 添加点位标记（支持全景图和视频）
  const addPointMarker = (point) => {
    if (!map.value) return null
    
    // 优先使用 GCJ02 坐标（高德地图瓦片需要）
    let displayLat = point.lat || point.latitude
    let displayLng = point.lng || point.longitude
    
    // 如果有 GCJ02 坐标，则使用 GCJ02 坐标
    if (point.gcj02Lat && point.gcj02Lng) {
      displayLat = point.gcj02Lat
      displayLng = point.gcj02Lng
    } else if (point.gcj02_lat && point.gcj02_lng) {
      displayLat = point.gcj02_lat
      displayLng = point.gcj02_lng
    }
    
    const pointType = point.type || 'panorama'
    const marker = createPointMarker([displayLat, displayLng], pointType, {
      title: point.title || (pointType === 'video' ? '视频点位' : '全景图')
    })
    
    // 添加点击事件
    marker.on('click', () => {
      onMarkerClick.value(point)
    })
    
    marker.addTo(map.value)
    markers.value.push({ id: point.id, marker, type: pointType })
    
    return marker
  }

  // 保持向后兼容的全景图标记方法
  const addPanoramaMarker = (panorama) => {
    return addPointMarker({ ...panorama, type: 'panorama' })
  }
  
  // 批量添加标记
  const addPanoramaMarkers = (panoramas) => {
    panoramas.forEach(panorama => {
      addPanoramaMarker(panorama)
    })
  }

  // 批量添加点位标记（支持混合类型）
  const addPointMarkers = (points) => {
    points.forEach(point => {
      addPointMarker(point)
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
    changeMapType,
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
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
