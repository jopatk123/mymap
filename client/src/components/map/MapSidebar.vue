<template>
  <div class="sidebar" :class="{ collapsed: sidebarCollapsed, hidden: !panoramaListVisible }">
    <div class="sidebar-header">
      <h3>点位列表</h3>
      <div class="header-actions">
        <el-button 
          @click="$emit('toggle-sidebar')" 
          link
          :icon="sidebarCollapsed ? Expand : Fold"
          :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        />
      </div>
    </div>
    
    <div class="sidebar-content" v-show="!sidebarCollapsed">
      <SearchFilter
        v-model="internalSearchParams"
        @search="onSearch"
        @locate="onLocate"
      />
      <PanoramaList
        :panoramas="panoramas"
        :current-panorama="currentPanorama"
        :loading="loading"
        :has-more="hasMore"
        @select-panorama="$emit('select-panorama', $event)"
        @view-panorama="$emit('view-panorama', $event)"
        @view-video="$emit('view-video', $event)"
        @locate-panorama="$emit('locate-panorama', $event)"
        @load-more="$emit('load-more')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Expand, Fold } from '@element-plus/icons-vue'
import PanoramaList from '@/components/map/PanoramaList.vue'
import SearchFilter from '@/components/map/SearchFilter.vue'

const props = defineProps({
  panoramas: {
    type: Array,
    default: () => []
  },
  currentPanorama: {
    type: Object,
    default: null
  },
  searchParams: {
    type: Object,
    default: () => ({ keyword: '' })
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false
  },
  panoramaListVisible: {
    type: Boolean,
    default: true
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
  'toggle-sidebar',
  'update:search-params',
  'search',
  'locate',
  'select-panorama',
  'view-panorama',
  'view-video',
  'locate-panorama',
  'load-more',
  'image-error'
])

const internalSearchParams = ref({ keyword: '' })

watch(() => props.searchParams, (val) => {
  internalSearchParams.value = { ...(val || { keyword: '' }) }
}, { immediate: true, deep: true })

const onSearch = (params) => {
  emit('update:search-params', params)
  emit('search', params)
}

const onLocate = ({ lat, lng }) => {
  emit('locate', { lat, lng })
}
</script>

<style lang="scss" scoped>
.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 350px;
  height: 100%;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  
  &.collapsed {
    transform: translateX(-310px);
  }
  
  &.hidden {
    transform: translateX(-100%);
  }
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      gap: 4px;
    }
  }
  
  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .search-section {
    padding: 16px;
    border-bottom: 1px solid #eee;
  }
  
  .filter-section {
    padding: 0 16px 16px;
    border-bottom: 1px solid #eee;
  }
  
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
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
}

// 移动端适配
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    
    &.collapsed {
      transform: translateX(-100%);
    }
  }
}
</style>