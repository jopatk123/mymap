<template>
  <div class="style-debug-view">
    <h1>🔧 点位样式调试页面</h1>
    <p>这个页面用于调试和测试点位样式配置的问题</p>
    
    <StyleDebugPanel />
    
    <div class="map-test-section">
      <h2>🗺️ 地图测试区域</h2>
      <p>在这里可以测试样式更新后的标记显示效果</p>
      <div class="test-markers">
        <button @click="createTestMarkers">创建测试标记</button>
        <button @click="clearTestMarkers">清除测试标记</button>
      </div>
      <div id="test-map" style="height: 400px; width: 100%; margin-top: 10px;"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import StyleDebugPanel from '@/components/StyleDebugPanel.vue'
import L from 'leaflet'
import { createPanoramaMarker, createVideoMarker, createAMapTileLayer } from '@/utils/map-utils.js'

let testMap = null
const testMarkers = ref([])

onMounted(() => {
  // 初始化测试地图
  testMap = L.map('test-map').setView([39.9042, 116.4074], 13)
  
  // 添加地图图层
  const tileLayer = createAMapTileLayer('normal')
  tileLayer.addTo(testMap)
})

// 创建测试标记
const createTestMarkers = () => {
  clearTestMarkers()
  
  // 创建几个测试点位
  const testPoints = [
    { lat: 39.9042, lng: 116.4074, type: 'panorama', title: '测试全景图1' },
    { lat: 39.9052, lng: 116.4084, type: 'video', title: '测试视频点位1' },
    { lat: 39.9032, lng: 116.4064, type: 'panorama', title: '测试全景图2' },
    { lat: 39.9062, lng: 116.4094, type: 'video', title: '测试视频点位2' }
  ]
  
  testPoints.forEach(point => {
    let marker
    if (point.type === 'panorama') {
      marker = createPanoramaMarker([point.lat, point.lng], { title: point.title })
    } else {
      marker = createVideoMarker([point.lat, point.lng], { title: point.title })
    }
    
    marker.addTo(testMap)
    testMarkers.value.push(marker)
  })
}

// 清除测试标记
const clearTestMarkers = () => {
  testMarkers.value.forEach(marker => {
    testMap.removeLayer(marker)
  })
  testMarkers.value = []
}
</script>

<style scoped>
.style-debug-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.map-test-section {
  margin-top: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.test-markers {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.test-markers button {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.test-markers button:hover {
  background: #218838;
}

.test-markers button:last-child {
  background: #dc3545;
}

.test-markers button:last-child:hover {
  background: #c82333;
}

h1, h2 {
  color: #333;
}
</style>