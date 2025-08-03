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
        <el-button @click="deletePanorama" type="danger">
          <el-icon><Delete /></el-icon>
          删除
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
      <div
        class="viewer-container"
        v-loading="isLoading"
        element-loading-text="全景图加载中..."
        element-loading-background="rgba(0, 0, 0, 0.7)"
      >
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, CopyDocument, Link, Refresh, FullScreen, RefreshLeft, Delete } from '@element-plus/icons-vue'
import { usePanorama } from '@/composables/usePanorama.js'
import { deletePanorama as deletePanoramaAPI } from '@/api/panorama.js'

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

const emit = defineEmits(['update:modelValue', 'panorama-deleted'])

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
    console.error('全景图数据缺失:', props.panorama)
    return
  }
  
  // 检查图片URL是否有效
  const imageUrl = props.panorama.imageUrl
  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
    ElMessage.error('全景图地址格式不正确')
    console.error('无效的图片URL:', imageUrl)
    return
  }
  
  viewerVisible.value = true
  
  // 等待DOM渲染完成后初始化查看器 - 增加延迟确保容器完全渲染
  setTimeout(async () => {
    try {
      const viewer = await initViewer('panorama-viewer', imageUrl)
      autoRotating.value = true
    } catch (error) {
      console.error('初始化全景图查看器失败:', error)
      ElMessage.error('加载全景图失败，请检查图片地址')
    }
  }, 500) // 增加延迟时间
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

// 在新窗口打开全景图查看器
const openInNewTab = () => {
  if (!props.panorama?.id) {
    ElMessage.error('全景图ID不存在')
    return
  }
  
  if (!props.panorama?.imageUrl) {
    ElMessage.error('全景图地址不存在，无法打开')
    return
  }
  
  // 创建全景图查看页面URL，使用路径参数方式
  const viewerUrl = `/panorama/${props.panorama.id}`
  window.open(viewerUrl, '_blank')
}

// 删除全景图
const deletePanorama = async () => {
  if (!props.panorama?.id) {
    ElMessage.error('全景图ID不存在')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要删除这个全景图吗？此操作将永久删除该点位及其所有信息，且无法恢复。',
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        center: true,
        confirmButtonClass: 'el-button--danger'
      }
    )

    // 用户确认删除
    await callDeletePanoramaAPI(props.panorama.id)
    
    ElMessage.success('全景图删除成功')
    
    // 关闭模态框并通知父组件
    visible.value = false
    emit('panorama-deleted', props.panorama.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除全景图失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }
}

// 调用API删除全景图
const callDeletePanoramaAPI = async (id) => {
  const response = await deletePanoramaAPI(id)
  // 检查响应结构：成功时返回 { success: true, message: "删除成功" }
  if (!response.success) {
    throw new Error(response.message || '删除失败')
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