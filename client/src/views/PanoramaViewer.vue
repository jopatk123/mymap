<template>
  <div class="panorama-viewer-page">
    <!-- 顶部工具栏 -->
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <h1>{{ panorama?.title || '全景图查看器' }}</h1>
        <span v-if="panorama?.description" class="description">
          {{ panorama.description }}
        </span>
      </div>
      <div class="toolbar-right">
        <el-button @click="toggleAutoRotate" type="info" size="small">
          <el-icon><Refresh /></el-icon>
          {{ autoRotating ? '停止旋转' : '自动旋转' }}
        </el-button>
        <el-button @click="toggleFullscreen" type="success" size="small">
          <el-icon><FullScreen /></el-icon>
          全屏
        </el-button>
        <el-button @click="resetView" type="warning" size="small">
          <el-icon><RefreshLeft /></el-icon>
          重置视角
        </el-button>
        <el-button @click="goBack" type="primary" size="small">
          <el-icon><Back /></el-icon>
          返回
        </el-button>
      </div>
    </div>

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
    <div v-if="panorama" class="viewer-footer">
      <div class="footer-info">
        <div class="info-item">
          <el-icon><Location /></el-icon>
          <span>{{ formatCoordinate(panorama.lat, panorama.lng) }}</span>
        </div>
        <div v-if="panorama.createdAt" class="info-item">
          <el-icon><Calendar /></el-icon>
          <span>{{ formatDate(panorama.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, FullScreen, RefreshLeft, Back, Location, Calendar, Warning } from '@element-plus/icons-vue'
import { usePanorama } from '@/composables/usePanorama.js'
import { getPanoramaById } from '@/api/panorama.js'

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

const panorama = ref(null)
const error = ref('')
const autoRotating = ref(false)

// 加载全景图数据
const loadPanorama = async () => {
  const id = route.params.id || route.query.id
  const imageFromQuery = route.query.image
  
  if (!id && !imageFromQuery) {
    error.value = '未提供全景图ID'
    return
  }
  
  // 如果有图片URL参数，直接使用
  if (imageFromQuery) {
    const imageUrl = decodeURIComponent(imageFromQuery)
    console.log('使用查询参数图片URL:', imageUrl)
    panorama.value = {
      id: id || 'direct',
      title: route.query.title ? decodeURIComponent(route.query.title) : '全景图',
      imageUrl: imageUrl,
      lat: route.query.lat || 0,
      lng: route.query.lng || 0,
      createdAt: route.query.createdAt || new Date().toISOString()
    }
    
    // 直接初始化查看器
    setTimeout(async () => {
      try {
        console.log('开始初始化查看器(直接模式):', imageUrl)
        await initViewer('panorama-viewer', imageUrl, {
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
    return
  }

  try {
    isLoading.value = true
    error.value = ''
    
    console.log('开始加载全景图ID:', id)
    const response = await getPanoramaById(id)
    console.log('API响应:', response)
    
    // 处理不同的响应格式
    const data = response.data || response
    if (data) {
      panorama.value = data
      console.log('全景图数据:', data)
      
      // 初始化全景图查看器
      if (data.imageUrl) {
        setTimeout(async () => {
          try {
            console.log('开始初始化查看器:', data.imageUrl)
            await initViewer('panorama-viewer', data.imageUrl, {
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
      } else {
        error.value = '全景图地址不存在'
      }
    } else {
      error.value = '全景图不存在'
    }
  } catch (err) {
    console.error('加载全景图失败:', err)
    error.value = '加载全景图失败: ' + (err.message || '未知错误')
  } finally {
    isLoading.value = false
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

// 格式化坐标
const formatCoordinate = (lat, lng) => {
  if (!lat || !lng) return '未知'
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  return new Date(dateString).toLocaleString('zh-CN')
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
.panorama-viewer-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  .viewer-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 1000;
    min-height: 60px;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 15px;

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }

      .description {
        color: #ccc;
        font-size: 14px;
        max-width: 400px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .toolbar-right {
      display: flex;
      gap: 8px;
    }
  }

  .viewer-main {
    flex: 1;
    position: relative;
    overflow: hidden;

    .viewer-loading,
    .viewer-error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      color: #fff;

      h3 {
        margin: 0;
        font-weight: 400;
      }
    }

    .panorama-viewer {
      width: 100%;
      height: 100%;
    }
  }

  .viewer-footer {
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 1000;

    .footer-info {
      display: flex;
      gap: 30px;

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #ccc;
      }
    }
  }
}

@media (max-width: 768px) {
  .panorama-viewer-page {
    .viewer-toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      padding: 10px;

      .toolbar-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;

        h1 {
          font-size: 18px;
        }

        .description {
          max-width: 100%;
          white-space: normal;
        }
      }

      .toolbar-right {
        justify-content: center;
        flex-wrap: wrap;

        .el-button {
          font-size: 12px;
          padding: 6px 12px;
        }
      }
    }

    .viewer-footer {
      padding: 8px 10px;

      .footer-info {
        flex-direction: column;
        gap: 5px;

        .info-item {
          font-size: 12px;
        }
      }
    }
  }
}
</style>