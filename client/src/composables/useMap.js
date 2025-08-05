import { ref, onUnmounted } from 'vue'
import L from 'leaflet'
import { createAMapTileLayer, createPointMarker } from '@/utils/map-utils.js'

export function useMap(containerId) {
  const map = ref(null)
  const markers = ref([])
  const kmlLayers = ref([])
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
    
    // 同时清除KML图层
    clearKmlLayers()
  }
  
  // 添加KML图层
  const addKmlLayer = async (kmlFile) => {
    if (!map.value || !kmlFile.file_url) return null
    
    try {
      // 使用fetch获取KML文件内容
      const response = await fetch(kmlFile.file_url)
      const kmlText = await response.text()
      
      // 解析KML并添加到地图
      const parser = new DOMParser()
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
      
      // 创建KML图层
      const kmlLayer = L.geoJSON(null, {
        style: {
          color: '#ff7800',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(`
              <div>
                <h4>${feature.properties.name}</h4>
                <p>来源: ${kmlFile.title}</p>
                ${feature.properties.description ? `<p>${feature.properties.description}</p>` : ''}
              </div>
            `)
          }
        }
      })
      
      // 解析KML中的几何要素
      const placemarks = kmlDoc.getElementsByTagName('Placemark')
      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i]
        const name = placemark.getElementsByTagName('name')[0]?.textContent || ''
        const description = placemark.getElementsByTagName('description')[0]?.textContent || ''
        
        // 解析坐标
        const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent
        if (coordinates) {
          const coords = coordinates.trim().split(/\s+/)
          const geoJsonFeatures = []
          
          coords.forEach(coord => {
            const [lng, lat, alt] = coord.split(',').map(Number)
            if (!isNaN(lat) && !isNaN(lng)) {
              geoJsonFeatures.push({
                type: 'Feature',
                properties: { name, description },
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                }
              })
            }
          })
          
          geoJsonFeatures.forEach(feature => {
            kmlLayer.addData(feature)
          })
        }
      }
      
      kmlLayer.addTo(map.value)
      kmlLayers.value.push({ id: kmlFile.id, layer: kmlLayer, title: kmlFile.title })
      
      return kmlLayer
    } catch (error) {
      console.error('加载KML文件失败:', error)
      return null
    }
  }
  
  // 批量添加KML图层
  const addKmlLayers = (kmlFiles) => {
    kmlFiles.forEach(kmlFile => {
      addKmlLayer(kmlFile)
    })
  }
  
  // 移除KML图层
  const removeKmlLayer = (id) => {
    const layerIndex = kmlLayers.value.findIndex(l => l.id === id)
    if (layerIndex > -1) {
      const { layer } = kmlLayers.value[layerIndex]
      map.value.removeLayer(layer)
      kmlLayers.value.splice(layerIndex, 1)
    }
  }
  
  // 清除所有KML图层
  const clearKmlLayers = () => {
    kmlLayers.value.forEach(({ layer }) => {
      map.value.removeLayer(layer)
    })
    kmlLayers.value = []
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
    kmlLayers,
    isLoading,
    initMap,
    changeMapType,
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
    addKmlLayer,
    addKmlLayers,
    removeMarker,
    removeKmlLayer,
    clearMarkers,
    clearKmlLayers,
    setCenter,
    fitBounds,
    getBounds,
    getZoom,
    getCenter,
    destroyMap,
    onMarkerClick
  }
}
