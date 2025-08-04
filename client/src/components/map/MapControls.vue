<template>
  <div class="map-controls">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button-group>
        <el-button 
          @click="togglePanoramaList" 
          type="primary"
          :icon="panoramaListVisible ? Hide : View"
          :title="panoramaListVisible ? '隐藏点位列表' : '显示点位列表'"
        >
          {{ panoramaListVisible ? '隐藏列表' : '显示列表' }}
        </el-button>
        <el-button @click="refreshData" :loading="loading" type="primary">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>

        <el-button @click="showSettings" type="info">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
      </el-button-group>
    </div>
    
    <!-- 状态栏 -->
    <div class="status-bar">
      <span>共 {{ totalCount }} 个点位</span>
      <span v-if="!isOnline" class="offline-indicator">离线模式</span>
    </div>
  </div>
</template>

<script setup>
import { 
  Refresh, Setting, 
  View, Hide 
} from '@element-plus/icons-vue'

const props = defineProps({
  panoramaListVisible: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  totalCount: {
    type: Number,
    default: 0
  },
  isOnline: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'toggle-panorama-list',
  'refresh-data',
  'show-settings'
])

const togglePanoramaList = () => {
  emit('toggle-panorama-list')
}

const refreshData = () => {
  emit('refresh-data')
}



const showSettings = () => {
  emit('show-settings')
}
</script>

<style lang="scss" scoped>
.map-controls {
  .toolbar {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
  }
  
  .status-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 32px;
    background: rgba(255, 255, 255, 0.9);
    border-top: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    font-size: 12px;
    color: #666;
    z-index: 1000;
    
    .offline-indicator {
      color: #e6a23c;
      font-weight: 500;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .map-controls {
    .toolbar {
      top: 10px;
      right: 10px;
      
      .el-button-group {
        flex-direction: column;
        
        .el-button {
          margin: 0 0 4px 0;
        }
      }
    }
  }
}
</style>