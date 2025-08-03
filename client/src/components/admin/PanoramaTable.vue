<template>
  <div class="table-container">
    <el-table
      :data="panoramas"
      v-loading="loading"
      @selection-change="$emit('selection-change', $event)"
      style="width: 100%"
    >
      <el-table-column type="selection" width="55" />
      
      <el-table-column label="缩略图" width="100">
        <template #default="{ row }">
          <img
            :src="row.thumbnailUrl || row.imageUrl || '/default-panorama.jpg'"
            :alt="row.title"
            class="thumbnail"
            @error="handleImageError"
          />
        </template>
      </el-table-column>
      
      <el-table-column prop="title" label="标题" min-width="150">
        <template #default="{ row }">
          <span :class="{ 'hidden-item': !row.is_visible }">
            {{ row.title }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="description" label="描述" min-width="200">
        <template #default="{ row }">
          <span class="description" :class="{ 'hidden-item': !row.is_visible }">
            {{ row.description || '暂无描述' }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="folder_name" label="文件夹" width="120">
        <template #default="{ row }">
          <span class="folder-name">{{ row.folder_name || '默认文件夹' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column label="坐标" width="150">
        <template #default="{ row }">
          <span>{{ formatCoordinate(row.lat, row.lng) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
            {{ row.is_visible ? '显示' : '隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-dropdown @command="(command) => $emit('row-action', command, row)" trigger="click">
            <el-button link size="small">
              <el-icon><MoreFilled /></el-icon>
              更多
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="view">
                  <el-icon><View /></el-icon>
                  查看
                </el-dropdown-item>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-dropdown-item>
                <el-dropdown-item command="toggle-visibility">
                  <el-icon>
                    <View v-if="!row.is_visible" />
                    <Hide v-else />
                  </el-icon>
                  {{ row.is_visible ? '隐藏' : '显示' }}
                </el-dropdown-item>
                <el-dropdown-item command="move" divided>
                  <el-icon><FolderOpened /></el-icon>
                  移动到文件夹
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon>
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          
          <el-button @click="$emit('view-panorama', row)" link size="small">
            <el-icon><View /></el-icon>
            查看
          </el-button>
          <el-button @click="$emit('edit-panorama', row)" link size="small">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { View, Edit, Delete, Hide, MoreFilled, FolderOpened } from '@element-plus/icons-vue'

defineProps({
  panoramas: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['selection-change', 'row-action', 'view-panorama', 'edit-panorama'])

// 图片加载错误
const handleImageError = (event) => {
  event.target.src = '/default-panorama.jpg'
}

// 格式化坐标
const formatCoordinate = (lat, lng) => {
  if (!lat || !lng) return '未知位置'
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.table-container {
  flex: 1;
  overflow: hidden;
  
  .thumbnail {
    width: 60px;
    height: 30px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #eee;
  }
  
  .description {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: #666;
  }
  
  .folder-name {
    color: #409eff;
    font-size: 12px;
  }
  
  .hidden-item {
    color: #999;
    text-decoration: line-through;
  }
}
</style>