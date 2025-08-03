<template>
  <el-table
    :data="fileList"
    v-loading="loading"
    @selection-change="$emit('selection-change', $event)"
    style="width: 100%"
  >
    <el-table-column type="selection" width="55" />
    
    <el-table-column label="类型" width="100">
      <template #default="{ row }">
        <el-tag :type="getFileTypeColor(row.fileType)">
          {{ row.displayType }}
        </el-tag>
      </template>
    </el-table-column>
    
    <el-table-column label="缩略图" width="100">
      <template #default="{ row }">
        <img
          :src="getFileThumbnail(row)"
          :alt="row.title"
          class="thumbnail"
          @error="$emit('image-error', $event)"
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
    
    <!-- 根据文件类型显示不同的信息列 -->
    <el-table-column label="位置/信息" width="150">
      <template #default="{ row }">
        <span v-if="row.fileType === 'panorama' || row.fileType === 'video'">
          {{ formatCoordinate(row.lat || row.latitude, row.lng || row.longitude) }}
        </span>
        <span v-else-if="row.fileType === 'kml'">
          {{ row.point_count || 0 }} 个点位
        </span>
      </template>
    </el-table-column>
    
    <el-table-column prop="created_at" label="创建时间" width="180">
      <template #default="{ row }">
        {{ formatDate(row.created_at || row.createdAt) }}
      </template>
    </el-table-column>
    
    <el-table-column label="状态" width="80">
      <template #default="{ row }">
        <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
          {{ row.is_visible ? '显示' : '隐藏' }}
        </el-tag>
      </template>
    </el-table-column>
    
    <el-table-column label="操作" width="200" fixed="right">
      <template #default="{ row }">
        <el-button @click="$emit('view-file', row)" link size="small">查看</el-button>
        <el-button @click="$emit('edit-file', row)" link size="small">编辑</el-button>
        <el-button @click="$emit('delete-file', row)" link size="small" type="danger">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
const props = defineProps({
  fileList: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  getFileTypeColor: {
    type: Function,
    required: true
  },
  getFileThumbnail: {
    type: Function,
    required: true
  },
  formatCoordinate: {
    type: Function,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
})

defineEmits(['selection-change', 'view-file', 'edit-file', 'delete-file', 'image-error'])
</script>

<style lang="scss" scoped>
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
</style>