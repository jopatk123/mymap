<template>
  <div class="panorama-viewer-page">
    <!-- 顶部工具栏 -->
    <PanoramaToolbar
      :panorama="panorama"
      :auto-rotating="autoRotating"
      @toggle-auto-rotate="toggleAutoRotate"
      @toggle-fullscreen="toggleFullscreen"
      @reset-view="resetView"
      @go-back="goBack"
    />

    <!-- 全景图查看器 -->
    <div class="viewer-main">
      <div v-if="isLoading" class="viewer-loading">
        <el-loading-spinner size="large" />
        <span>全景图加载中...</span>
      </div>
      <div v-if="error" class="viewer-error">
        <el-icon size="48"><Warning /></el-icon>
        <h3>{{ error }}</h3>
        <el-button @click="loadPanorama" type="primary">重新加载</el-button>
      </div>
      <div 
        v-show="!isLoading && !error" 
        id="panorama-viewer" 
        class="panorama-viewer"
      ></div>
    </div>

    <!-- 底部信息栏 -->
    <PanoramaFooter :panorama="panorama" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { usePanorama } from '@/composables/usePanorama.js'
import { PanoramaViewerService } from '@/services/panorama-viewer-service.js'
import PanoramaToolbar from '@/components/panorama/PanoramaToolbar.vue'
import PanoramaFooter from '@/components/panorama/PanoramaFooter.vue'

const route = useRoute()
const router = useRouter()

const {
  viewer,
  isLoading,
  initViewer,
  closeViewer,
  toggleAutoRotate: togglePanoramaAutoRotate,
  toggleFullscreen: togglePanoramaFullscreen,
  setView
} = usePanorama()

const panoramaService = new PanoramaViewerService()
const panorama = ref(null)
const error = ref('')
const autoRotating = ref(false)

// 加载全景图数据
const loadPanorama = async () => {
  try {
    const loadedPanorama = await panoramaService.loadPanorama(route)
    panorama.value = loadedPanorama
    
    // 初始化查看器
    setTimeout(async () => {
      try {
        await initViewer('panorama-viewer', loadedPanorama.imageUrl, {
          autoRotate: -2,
          compass: true,
          showZoomCtrl: true,
          showFullscreenCtrl: true,
          autoLoad: true
        })
        autoRotating.value = true
      } catch (err) {
        console.error('初始化全景图查看器失败:', err)
        error.value = '初始化全景图查看器失败'
      }
    }, 100)
  } catch (err) {
    console.error('加载全景图失败:', err)
    error.value = err.message
  }
  
  // 同步加载状态
  const { isLoading: serviceLoading, error: serviceError } = panoramaService.getLoadingState()
  isLoading.value = serviceLoading
  if (serviceError) {
    error.value = serviceError
  }
}

// 切换自动旋转
const toggleAutoRotate = () => {
  togglePanoramaAutoRotate()
  autoRotating.value = !autoRotating.value
}

// 切换全屏
const toggleFullscreen = () => {
  togglePanoramaFullscreen()
}

// 重置视角
const resetView = () => {
  setView(0, 0, 75)
}

// 返回
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}



// 监听键盘事件
const handleKeyPress = (event) => {
  switch (event.key) {
    case 'Escape':
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        goBack()
      }
      break
    case 'f':
    case 'F':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        toggleFullscreen()
      }
      break
    case 'r':
    case 'R':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        resetView()
      }
      break
  }
}

onMounted(() => {
  // 确保DOM完全加载后再加载数据
  setTimeout(() => {
    loadPanorama()
  }, 100)
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  closeViewer()
  document.removeEventListener('keydown', handleKeyPress)
})
</script>

<style lang="scss" scoped>
@import '@/styles/panoramaViewer.scss';
</style>