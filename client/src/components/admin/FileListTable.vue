<template>
  <el-table
    v-loading="loading"
    :data="fileList"
    style="width: 100%"
    @selection-change="$emit('selection-change', $event)"
  >
    <el-table-column type="selection" width="55" />

    <el-table-column label="类型" width="100">
      <template #default="{ row }">
        <el-tag :type="getFileTypeColor(row.fileType)">
          {{ getDisplayType(row.fileType) }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="缩略图" width="100">
      <template #default="{ row }">
        <div class="thumbnail-container">
          <img
            v-if="row.fileType === 'panorama' && (row.thumbnailUrl || row.imageUrl)"
            :src="getFileThumbnail(row)"
            :alt="row.title"
            class="thumbnail"
            @error="$emit('image-error', $event)"
          />
          <div v-else-if="row.fileType === 'video'" class="video-thumbnail">
            <img
              v-if="row.thumbnailUrl"
              :src="row.thumbnailUrl"
              :alt="row.title"
              class="thumbnail"
              @error="showVideoPlaceholder = true"
            />
            <div v-else class="video-placeholder">
              <span class="video-icon">▶</span>
              <span class="video-text">视频</span>
            </div>
          </div>
          <div v-else-if="row.fileType === 'kml'" class="kml-placeholder">
            <span class="kml-icon">📍</span>
            <span class="kml-text">KML</span>
          </div>

          <div v-else class="default-placeholder">
            <span>文件</span>
          </div>
        </div>
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
        <span v-else-if="row.fileType === 'kml'"> {{ row.point_count || 0 }} 个点位 </span>
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
        <el-button link size="small" @click="$emit('view-file', row)">查看</el-button>
        <el-button link size="small" @click="$emit('edit-file', row)">编辑</el-button>
        <el-button link size="small" type="danger" @click="$emit('delete-file', row)"
          >删除</el-button
        >
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
defineProps({
  fileList: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  getFileTypeColor: {
    type: Function,
    required: true,
  },
  getFileThumbnail: {
    type: Function,
    required: true,
  },
  formatCoordinate: {
    type: Function,
    required: true,
  },
  formatDate: {
    type: Function,
    required: true,
  },
});

defineEmits(['selection-change', 'view-file', 'edit-file', 'delete-file', 'image-error']);

// 获取显示类型
const getDisplayType = (fileType) => {
  const types = {
    panorama: '全景图',
    video: '视频',
    kml: 'KML文件',
  };
  return types[fileType] || '未知';
};
</script>

<style lang="scss" scoped>
.thumbnail-container {
  width: 60px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail {
  width: 60px;
  height: 30px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
}

.video-placeholder,
.kml-placeholder,
.default-placeholder {
  width: 60px;
  height: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 10px;
  color: #666;
}

.video-placeholder {
  background-color: #f0f9ff;
  border-color: #28a745;
}

.video-icon {
  font-size: 12px;
  color: #28a745;
  margin-bottom: 2px;
}

.video-text {
  font-size: 8px;
  color: #28a745;
}

.kml-placeholder {
  background-color: #fff7e6;
  border-color: #ffa940;
}

.kml-icon {
  font-size: 12px;
  color: #ffa940;
  margin-bottom: 2px;
}

.kml-text {
  font-size: 8px;
  color: #ffa940;
}

.default-placeholder {
  background-color: #f5f5f5;
  border-color: #ccc;
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
