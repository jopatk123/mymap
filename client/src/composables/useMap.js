import { ref, onUnmounted } from 'vue'
import L from 'leaflet'
import { createAMapTileLayer, createPointMarker } from '@/utils/map-utils.js'
import StyleRenderer from '@/services/StyleRenderer.js'

// 创建一个样式渲染器实例
const styleRenderer = new StyleRenderer()

// 默认样式
const defaultStyles = {
  point_color: '#ff7800',
  point_size: 8,
  point_opacity: 1.0,
  point_label_size: 12,
  point_label_color: '#000000',
  line_color: '#ff7800',
  line_width: 2,
  line_opacity: 0.8,
  line_style: 'solid',
  polygon_fill_color: '#ff7800',
  polygon_fill_opacity: 0.3,
  polygon_stroke_color: '#ff7800',
  polygon_stroke_width: 2,
  polygon_stroke_style: 'solid',
  cluster_enabled: true,
}

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
  const addKmlLayer = async (kmlFile, styleConfig = null) => {
    if (!map.value || !kmlFile.file_url) {
      console.warn('无法添加KML图层：地图未初始化或文件URL为空', { map: !!map.value, fileUrl: kmlFile.file_url })
      return null
    }
    
    try {
      console.log('开始加载KML文件:', kmlFile.title, kmlFile.file_url)
      
      // 使用fetch获取KML文件内容
      const response = await fetch(kmlFile.file_url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const kmlText = await response.text()
      console.log('KML文件内容长度:', kmlText.length)
      
      // 解析KML并添加到地图
      const parser = new DOMParser()
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
      
      // 检查解析错误
      const parseError = kmlDoc.getElementsByTagName('parsererror')
      if (parseError.length > 0) {
        throw new Error('KML文件解析失败: ' + parseError[0].textContent)
      }
      
      // 合并默认样式和传入的样式
      const effectiveStyle = { ...defaultStyles, ...(styleConfig || {}) }

      // 创建KML图层
      const kmlLayer = L.geoJSON(null, {
        style: (feature) => {
          const geometryType = feature.geometry.type.toLowerCase();
          if (geometryType.includes('line')) {
            return styleRenderer.renderLineStyle(feature, effectiveStyle);
          }
          if (geometryType.includes('polygon')) {
            return styleRenderer.renderPolygonStyle(feature, effectiveStyle);
          }
          return {};
        },
        pointToLayer: (feature, latlng) => {
          const showLabel = typeof effectiveStyle.point_label_size === 'number' && effectiveStyle.point_label_size > 0;

          if (!showLabel) {
            // 不显示标签，返回一个简单的圆形标记
            return L.circleMarker(latlng, {
                renderer: L.canvas(),
                color: effectiveStyle.point_color,
                fillColor: effectiveStyle.point_color,
                fillOpacity: effectiveStyle.point_opacity,
                weight: 1,
                radius: effectiveStyle.point_size,
            });
          }

          // 显示标签，创建自定义的DivIcon
          const pointSize = effectiveStyle.point_size;
          const labelSize = effectiveStyle.point_label_size;
          const pointColor = effectiveStyle.point_color;
          const labelColor = effectiveStyle.point_label_color;
          const pointOpacity = effectiveStyle.point_opacity;

          const iconHtml = `
            <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: ${pointSize * 2}px;
                height: ${pointSize * 2}px;
                background-color: ${pointColor};
                opacity: ${pointOpacity};
                border-radius: 50%;
              "></div>
              <div style="
                position: absolute;
                left: 50%;
                top: 100%;
                transform: translateX(-50%);
                margin-top: 2px;
                padding: 2px 5px;
                background-color: rgba(255, 255, 255, 0.75);
                border-radius: 3px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                white-space: nowrap;
                font-weight: 500;
                text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
                font-size: ${labelSize}px;
                color: ${labelColor};
                /* 强制水平显示 */
                writing-mode: horizontal-tb !important;
                text-orientation: mixed !important;
                display: inline-block !important;
                font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
              ">
                ${feature.properties.name}
              </div>
            </div>
          `;

          const icon = L.divIcon({
              html: iconHtml,
              className: '', // className置空，因为所有样式都是内联的
              iconSize: [pointSize * 2, pointSize * 2 + labelSize + 5],
              iconAnchor: [pointSize, pointSize],
          });

          return L.marker(latlng, { icon: icon });
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && (feature.properties.name || feature.properties.description)) {
            const popupContent = `
              <div style="max-width: 200px;">
                ${feature.properties.name ? `<h4 style="margin: 0 0 8px 0;">${feature.properties.name}</h4>` : ''}
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">来源: ${kmlFile.title}</p>
                ${feature.properties.description ? `<div style="font-size: 12px;">${feature.properties.description}</div>` : ''}
              </div>
            `
            layer.bindPopup(popupContent)
          }
        }
      })
      
      let featureCount = 0
      
      // 解析KML中的几何要素
      const placemarks = kmlDoc.getElementsByTagName('Placemark')
      console.log('找到Placemark数量:', placemarks.length)
      
      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i]
        // 尝试获取name标签，如果没有则尝试n标签（某些KML文件使用n标签）
        let name = placemark.getElementsByTagName('name')[0]?.textContent
        if (!name) {
          name = placemark.getElementsByTagName('n')[0]?.textContent
        }
        name = name || `地标${i + 1}`
        
        const description = placemark.getElementsByTagName('description')[0]?.textContent || ''
        
        // 解析点要素
        const points = placemark.getElementsByTagName('Point')
        for (let j = 0; j < points.length; j++) {
          const coordinates = points[j].getElementsByTagName('coordinates')[0]?.textContent
          if (coordinates) {
            const coords = coordinates.trim().split(',')
            const lng = parseFloat(coords[0])
            const lat = parseFloat(coords[1])
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const feature = {
                type: 'Feature',
                properties: { name, description },
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                }
              }
              kmlLayer.addData(feature)
              featureCount++
            }
          }
        }
        
        // 解析线要素
        const lineStrings = placemark.getElementsByTagName('LineString')
        for (let j = 0; j < lineStrings.length; j++) {
          const coordinates = lineStrings[j].getElementsByTagName('coordinates')[0]?.textContent
          if (coordinates) {
            const coordPairs = coordinates.trim().split(/\s+/)
            const lineCoords = []
            
            coordPairs.forEach(pair => {
              const coords = pair.split(',')
              const lng = parseFloat(coords[0])
              const lat = parseFloat(coords[1])
              if (!isNaN(lat) && !isNaN(lng)) {
                lineCoords.push([lng, lat])
              }
            })
            
            if (lineCoords.length > 1) {
              const feature = {
                type: 'Feature',
                properties: { name, description },
                geometry: {
                  type: 'LineString',
                  coordinates: lineCoords
                }
              }
              kmlLayer.addData(feature)
              featureCount++
            }
          }
        }
        
        // 解析面要素
        const polygons = placemark.getElementsByTagName('Polygon')
        for (let j = 0; j < polygons.length; j++) {
          const outerBoundary = polygons[j].getElementsByTagName('outerBoundaryIs')[0]
          if (outerBoundary) {
            const coordinates = outerBoundary.getElementsByTagName('coordinates')[0]?.textContent
            if (coordinates) {
              const coordPairs = coordinates.trim().split(/\s+/)
              const polygonCoords = []
              
              coordPairs.forEach(pair => {
                const coords = pair.split(',')
                const lng = parseFloat(coords[0])
                const lat = parseFloat(coords[1])
                if (!isNaN(lat) && !isNaN(lng)) {
                  polygonCoords.push([lng, lat])
                }
              })
              
              if (polygonCoords.length > 2) {
                const feature = {
                  type: 'Feature',
                  properties: { name, description },
                  geometry: {
                    type: 'Polygon',
                    coordinates: [polygonCoords]
                  }
                }
                kmlLayer.addData(feature)
                featureCount++
              }
            }
          }
        }
      }
      
      console.log(`KML文件 "${kmlFile.title}" 解析完成，添加了 ${featureCount} 个要素`)
      
            if (featureCount > 0) {
        kmlLayer.addTo(map.value)
        kmlLayers.value.push({ id: kmlFile.id, layer: kmlLayer, title: kmlFile.title })
        
        console.log('KML图层已添加到地图')
        return kmlLayer
      } else {
        console.warn('KML文件中没有找到有效的几何要素')
        return null
      }
      
    } catch (error) {
      console.error('加载KML文件失败:', error)
      console.error('KML文件信息:', { title: kmlFile.title, url: kmlFile.file_url })
      return null
    }
  }
  
  // 批量添加KML图层
  const addKmlLayers = (kmlFiles) => {
    kmlFiles.forEach(kmlFile => {
      // 确保传递了styleConfig
      addKmlLayer(kmlFile, kmlFile.styleConfig)
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


