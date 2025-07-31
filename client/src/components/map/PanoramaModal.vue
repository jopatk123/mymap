<template>
  <el-dialog
    v-model="visible"
    :title="panorama?.title || '全景图'"
    width="80%"
    class="panorama-modal"
    @close="handleClose"
    destroy-on-close
  >
    <div class="panorama-content">
      <!-- 全景图信息 -->
      <div class="panorama-info">
        <div class="info-item">
          <span class="label">标题：</span>
          <span class="value">{{ panorama?.title || '未命名' }}</span>
        </div>
        <div class="info-item" v-if="panorama?.description">
          <span class="label">描述：</span>
          <span class="value">{{ panorama.description }}</span>
        </div>
        <div class="info-item">
          <span class="label">坐标：</span>
          <span class="value">{{ formatCoordinate(panorama?.lat, panorama?.lng) }}</span>
        </div>
        <div class="info-item" v-if="panorama?.createdAt">
          <span class="label">创建时间：</span>
          <span class="value">{{ formatDate(panorama.createdAt) }}</span>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="panorama-actions">
        <el-button @click="openViewer" type="primary" :loading="isLoading">
          <el-icon><View /></el-icon>
          查看全景图
        </el-button>
        <el-button @click="copyCoordinate" type="info">
          <el-icon><CopyDocument /></el-icon>
          复制坐标
        </el-button>
        <el-button @click="openInNewTab" type="success">
          <el-icon><Link /></el-icon>
          新窗口打开
        </el-button>
      </div>
    </div>
    
    <!-- 全景图查看器 -->
    <el-dialog
      v-model="viewerVisible"
      title="全景图查看"
      width="90%"
      class="panorama-viewer-modal"
      @close="closeViewer"
      destroy-on-close
      append-to-body
    >
      <div class="viewer-container">
        <div v-if="isLoading" class="viewer-loading">
          <el-loading-spinner size="large" />
          <span>全景图加载中...</span>
        </div>
        <div id="panorama-viewer" class="panorama-viewer"></div>
      </div>
      
      <template #footer>
        <div class="viewer-controls">
          <el-button @click="toggleAutoRotate" type="info">
            <el-icon><Refresh /></el-icon>
            {{ autoRotating ? '停止旋转' : '自动旋转' }}
          </el-button>
          <el-button @click="toggleFullscreen" type="success">
            <el-icon><FullScreen /></el-icon>
            全屏
          </el-button>
          <el-button @click="resetView" type="warning">
            <el-icon><RefreshLeft /></el-icon>
            重置视角
          </el-button>
          <el-button @click="closeViewer">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { View, CopyDocument, Link, Refresh, FullScreen, RefreshLeft } from '@element-plus/icons-vue'
import { usePanorama } from '@/composables/usePanorama.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  panorama: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const viewerVisible = ref(false)
const autoRotating = ref(false)

const {
  viewer,
  isLoading,
  initViewer,
  closeViewer: closePanoramaViewer,
  toggleAutoRotate: togglePanoramaAutoRotate,
  toggleFullscreen: togglePanoramaFullscreen,
  setView
} = usePanorama()

// 处理模态框关闭
const handleClose = () => {
  visible.value = false
  if (viewerVisible.value) {
    closeViewer()
  }
}

// 打开全景图查看器
const openViewer = async () => {
  if (!props.panorama?.imageUrl) {
    ElMessage.error('全景图地址不存在')
    return
  }
  
  viewerVisible.value = true
  
  // 等待DOM渲染完成后初始化查看器
  setTimeout(async () => {
    await initViewer('panorama-viewer', props.panorama.imageUrl, {
      autoRotate: -2,
      compass: true,
      showZoomCtrl: true,
      showFullscreenCtrl: true
    })
    autoRotating.value = true
  }, 100)
}

// 关闭全景图查看器
const closeViewer = () => {
  closePanoramaViewer()
  viewerVisible.value = false
  autoRotating.value = false
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

// 复制坐标
const copyCoordinate = async () => {
  if (!props.panorama) return
  
  const coordinate = `${props.panorama.lat}, ${props.panorama.lng}`
  
  try {
    await navigator.clipboard.writeText(coordinate)
    ElMessage.success('坐标已复制到剪贴板')
  } catch (error) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = coordinate
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('坐标已复制到剪贴板')
  }
}

// 在新窗口打开
const openInNewTab = () => {
  if (!props.panorama?.imageUrl) {
    ElMessage.error('全景图地址不存在')
    return
  }
  
  window.open(props.panorama.imageUrl, '_blank')
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
</script>

<style lang="scss" scoped>
.panorama-modal {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.panorama-content {
  .panorama-info {
    margin-bottom: 20px;
    
    .info-item {
      display: flex;
      margin-bottom: 12px;
      
      .label {
        font-weight: 500;
        color: #606266;
        min-width: 80px;
      }
      
      .value {
        color: #303133;
        flex: 1;
      }
    }
  }
  
  .panorama-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.panorama-viewer-modal {
  :deep(.el-dialog__body) {
    padding: 0;
    height: 70vh;
  }
  
  .viewer-container {
    position: relative;
    width: 100%;
    height: 100%;
    
    .viewer-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      
      span {
        font-size: 16px;
        color: #666;
      }
    }
    
    .panorama-viewer {
      width: 100%;
      height: 100%;
      background: #000;
    }
  }
  
  .viewer-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .panorama-modal {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 5vh auto;
    }
  }
  
  .panorama-viewer-modal {
    :deep(.el-dialog) {
      width: 98% !important;
      margin: 1vh auto;
    }
    
    :deep(.el-dialog__body) {
      height: 60vh;
    }
  }
  
  .panorama-actions {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
  
  .viewer-controls {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
}
</style>