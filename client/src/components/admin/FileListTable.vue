<template>
  <!-- 桌面端表格视图 -->
  <el-table
    v-if="!isMobile"
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

          <div v-else-if="row.fileType === 'image-set'" class="image-set-thumbnail">
            <img
              v-if="row.thumbnailUrl || row.imageUrl || row.cover_url"
              :src="row.thumbnailUrl || row.imageUrl || row.cover_url"
              :alt="row.title"
              class="thumbnail"
              @error="$emit('image-error', $event)"
            />
            <div v-else class="image-set-placeholder">
              <span class="image-set-icon">🖼️</span>
              <span class="image-set-text">图集</span>
            </div>
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
        <span v-if="isCoordinateFile(row.fileType)">
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

  <!-- 移动端卡片视图 -->
  <div v-else class="mobile-file-list" v-loading="loading">
    <!-- 全选控制 -->
    <div class="mobile-select-all">
      <el-checkbox
        v-model="selectAll"
        :indeterminate="isIndeterminate"
        @change="handleSelectAllChange"
      >
        全选 ({{ selectedItems.length }}/{{ fileList.length }})
      </el-checkbox>
    </div>

    <!-- 文件卡片列表 -->
    <div class="card-list">
      <div
        v-for="file in fileList"
        :key="file.id"
        class="file-card"
        :class="{ 'is-selected': isSelected(file), 'is-hidden': !file.is_visible }"
        @click="toggleSelect(file)"
      >
        <!-- 选择框和缩略图 -->
        <div class="card-left">
          <el-checkbox
            :model-value="isSelected(file)"
            @click.stop
            @change="toggleSelect(file)"
          />
          <div class="card-thumbnail">
            <img
              v-if="isPreviewFile(file) && hasPreviewImage(file)"
              :src="getFileThumbnail(file)"
              :alt="file.title"
              @error="$emit('image-error', $event)"
            />
            <div v-else-if="file.fileType === 'video'" class="type-icon video">▶</div>
            <div v-else-if="file.fileType === 'kml'" class="type-icon kml">📍</div>
            <div v-else class="type-icon default">📄</div>
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="card-content">
          <div class="card-header">
            <span class="card-title" :class="{ 'hidden-item': !file.is_visible }">
              {{ file.title }}
            </span>
            <el-tag :type="getFileTypeColor(file.fileType)" size="small">
              {{ getDisplayType(file.fileType) }}
            </el-tag>
          </div>
          <div class="card-meta">
            <span class="folder">📁 {{ file.folder_name || '默认' }}</span>
            <el-tag :type="file.is_visible ? 'success' : 'info'" size="small">
              {{ file.is_visible ? '显示' : '隐藏' }}
            </el-tag>
          </div>
          <div class="card-info">
            <span v-if="isCoordinateFile(file.fileType)" class="location">
              📍 {{ formatCoordinate(file.lat || file.latitude, file.lng || file.longitude) }}
            </span>
            <span v-else-if="file.fileType === 'kml'" class="points">
              {{ file.point_count || 0 }} 个点位
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions" @click.stop>
          <el-button circle size="small" @click="$emit('view-file', file)">
            <el-icon><View /></el-icon>
          </el-button>
          <el-button circle size="small" @click="$emit('edit-file', file)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button circle size="small" type="danger" @click="$emit('delete-file', file)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-if="fileList.length === 0" description="暂无文件" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { View, Edit, Delete } from '@element-plus/icons-vue';

const props = defineProps({
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
  isMobile: {
    type: Boolean,
    default: false,
  },
});

const isCoordinateFile = (fileType) =>
  fileType === 'panorama' || fileType === 'video' || fileType === 'image-set';

const isPreviewFile = (file) => file?.fileType === 'panorama' || file?.fileType === 'image-set';

const hasPreviewImage = (file) => Boolean(file?.thumbnailUrl || file?.imageUrl || file?.cover_url);

const emit = defineEmits(['selection-change', 'view-file', 'edit-file', 'delete-file', 'image-error']);

// 移动端选择状态管理
const selectedItems = ref([]);

const selectAll = computed({
  get: () => selectedItems.value.length === props.fileList.length && props.fileList.length > 0,
  set: () => {},
});

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < props.fileList.length;
});

const isSelected = (file) => {
  return selectedItems.value.some(item => item.id === file.id);
};

const toggleSelect = (file) => {
  const index = selectedItems.value.findIndex(item => item.id === file.id);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(file);
  }
  emit('selection-change', selectedItems.value);
};

const handleSelectAllChange = (val) => {
  if (val) {
    selectedItems.value = [...props.fileList];
  } else {
    selectedItems.value = [];
  }
  emit('selection-change', selectedItems.value);
};

// 当文件列表变化时清空选择
watch(() => props.fileList, () => {
  selectedItems.value = [];
  emit('selection-change', []);
}, { deep: true });

// 获取显示类型
const getDisplayType = (fileType) => {
  const types = {
    panorama: '全景图',
    video: '视频',
    kml: 'KML文件',
    'image-set': '图片集',
  };
  return types[fileType] || '未知';
};
</script>

<style lang="scss" src="./FileListTable.scss" scoped></style>
