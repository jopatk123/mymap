<template>
  <div class="sidebar" :class="{ collapsed: sidebarCollapsed, hidden: !panoramaListVisible }">
    <div class="sidebar-header">
      <h3>全景图列表</h3>
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
      <!-- 搜索和筛选 -->
      <SearchFilter
        :model-value="searchParams"
        @update:model-value="$emit('update:searchParams', $event)"
        @search="$emit('search', $event)"
        @sort-change="$emit('sort-change', $event)"
      />
      
      <!-- 全景图列表 -->
      <PanoramaList
        :panoramas="panoramas"
        :current-panorama="currentPanorama"
        :loading="loading"
        :has-more="hasMore"
        @select-panorama="$emit('select-panorama', $event)"
        @view-panorama="$emit('view-panorama', $event)"
        @locate-panorama="$emit('locate-panorama', $event)"
        @load-more="$emit('load-more')"
      />
    </div>
  </div>
</template>

<script setup>
import { Expand, Fold } from '@element-plus/icons-vue'
import PanoramaList from '@/components/map/PanoramaList.vue'
import SearchFilter from '@/components/map/SearchFilter.vue'

defineProps({
  sidebarCollapsed: {
    type: Boolean,
    required: true
  },
  panoramaListVisible: {
    type: Boolean,
    required: true
  },
  searchParams: {
    type: Object,
    required: true
  },
  panoramas: {
    type: Array,
    required: true
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

defineEmits([
  'toggle-sidebar',
  'update:searchParams',
  'search',
  'sort-change',
  'select-panorama',
  'view-panorama',
  'locate-panorama',
  'load-more'
])
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