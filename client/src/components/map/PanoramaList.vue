<template>
  <div class="panorama-list">
    <div
      v-for="panorama in panoramas"
      :key="panorama.id"
      class="panorama-item"
      :class="{ active: currentPanorama?.id === panorama.id }"
      @click="selectPanorama(panorama)"
    >
      <div class="panorama-thumbnail">
        <div v-if="panorama.type === 'video'" class="video-thumbnail-placeholder">
          <el-icon><VideoCamera /></el-icon>
        </div>
        <img 
          v-else
          :src="panorama.thumbnailUrl || panorama.imageUrl || '/default-panorama.jpg'" 
          :alt="panorama.title"
          @error="handleImageError"
        />
      </div>
      <div class="panorama-info">
        <h4>{{ panorama.title || '未命名' }}</h4>
        <p class="description">{{ panorama.description || '暂无描述' }}</p>
        <div class="meta">
          <span class="coordinate">
            {{ formatCoordinate(panorama.lat, panorama.lng) }}
          </span>
          <span class="date">
            {{ formatDate(panorama.createdAt) }}
          </span>
        </div>
      </div>
      <div class="panorama-actions">
        <el-button 
          @click.stop="viewPanorama(panorama)" 
          type="primary" 
          size="small"
          circle
        >
          <el-icon><View /></el-icon>
        </el-button>
        <el-button 
          @click.stop="locatePanorama(panorama)" 
          type="info" 
          size="small"
          circle
        >
          <el-icon><Location /></el-icon>
        </el-button>
      </div>
    </div>
    
    <!-- 加载更多 -->
    <div class="load-more" v-if="hasMore">
      <el-button 
        @click="loadMore" 
        :loading="loading" 
        link
        style="width: 100%"
      >
        加载更多
      </el-button>
    </div>
    
    <!-- 空状态 -->
    <div class="empty-state" v-if="!loading && panoramas.length === 0">
      <el-empty description="暂无点位数据" />
    </div>
  </div>
</template>

<script setup>
import { View, Location, VideoCamera } from '@element-plus/icons-vue'

const props = defineProps({
  panoramas: {
    type: Array,
    default: () => []
  },
  currentPanorama: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'select-panorama',
  'view-panorama',
  'view-video',
  'locate-panorama',
  'load-more'
])

const selectPanorama = (panorama) => {
  console.log('🔍 PanoramaList点击的数据:', panorama)
  console.log('🔍 数据结构检查:', {
    id: panorama.id,
    title: panorama.title,
    type: panorama.type,
    lat: panorama.lat,
    lng: panorama.lng,
    hasMarker: !!panorama.marker,
    hasData: !!panorama.data
  })
  
  // 临时修复：如果数据结构不正确，尝试从data字段中提取正确的数据
  let cleanPanorama = panorama
  if (panorama.marker && panorama.data) {
    console.log('⚠️ 检测到错误的数据结构，尝试修复...')
    cleanPanorama = panorama.data
  }
  
  emit('select-panorama', cleanPanorama)
}

const viewPanorama = (panorama) => {
  // 根据点位类型发出不同的事件
  if (panorama.type === 'video' || panorama.video_url) {
    // 视频点位 - 发出视频查看事件
    emit('view-video', panorama)
  } else {
    // 全景图点位 - 发出全景图查看事件
    emit('view-panorama', panorama)
  }
}

const locatePanorama = (panorama) => {
  emit('locate-panorama', panorama)
}

const loadMore = () => {
  emit('load-more')
}

const handleImageError = (event) => {
  event.target.src = '/default-panorama.jpg'
}

const formatCoordinate = (lat, lng) => {
  if (lat == null || lng == null) return '未知位置'
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`
}

const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  return new Date(dateString).toLocaleDateString('zh-CN')
}
</script>

<style lang="scss" scoped>
.panorama-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  
  .panorama-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid #eee;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
    }
    
    &.active {
      border-color: #409eff;
      background: rgba(64, 158, 255, 0.05);
    }
    
    .panorama-thumbnail {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      overflow: hidden;
      margin-right: 12px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f0f2f5;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .video-thumbnail-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, #eef5ff, #d9e8ff);
        color: #409eff;
        .el-icon {
          font-size: 32px;
        }
      }
    }
    
    .panorama-info {
      flex: 1;
      min-width: 0;
      
      h4 {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .description {
        margin: 0 0 8px;
        font-size: 12px;
        color: #909399;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        
        span {
          font-size: 11px;
          color: #c0c4cc;
        }
      }
    }
    
    .panorama-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 8px;
    }
  }
  
  .load-more {
    padding: 16px;
    text-align: center;
  }
  
  .empty-state {
    padding: 40px 16px;
    text-align: center;
  }
}
</style>