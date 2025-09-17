<template>
  <div class="search-section">
    <el-form :model="localForm" inline>
      <el-form-item label="文件类型">
  <el-select v-model="localForm.fileType" @change="$emit('search', { ...localForm })">
          <el-option label="全部" value="all" />
          <el-option label="全景图" value="panorama" />
          <el-option label="视频点位" value="video" />
          <el-option label="KML文件" value="kml" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input
          v-model="localForm.keyword"
          placeholder="搜索标题或描述"
          clearable
          @keyup.enter="$emit('search', { ...localForm })"
        />
      </el-form-item>
      <el-form-item label="显示隐藏">
        <el-switch
          v-model="localForm.includeHidden"
          active-text="是"
          inactive-text="否"
          @change="$emit('search', { ...localForm })"
        />
      </el-form-item>
      <el-form-item>
  <el-button type="primary" @click="$emit('search', { ...localForm })">搜索</el-button>
        <el-button @click="$emit('refresh')">刷新</el-button>
        <el-button
          type="danger"
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="$emit('batch-delete')"
        >
          <el-icon><Delete /></el-icon>
          删除{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </el-button>
        <el-button :disabled="selectedCount === 0" :loading="loading" @click="$emit('batch-hide')">
          <el-icon><Hide /></el-icon>
          隐藏{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </el-button>
        <el-button
          type="success"
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="$emit('batch-show')"
        >
          <el-icon><View /></el-icon>
          显示{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </el-button>
        <el-button
          type="primary"
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="$emit('batch-move')"
        >
          <el-icon><FolderOpened /></el-icon>
          移动
        </el-button>
        <el-button
          type="info"
          :disabled="selectedCount === 0"
          :loading="downloading"
          @click="$emit('batch-download')"
        >
          <el-icon><Download /></el-icon>
          下载{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { Delete, Hide, FolderOpened, View, Download } from '@element-plus/icons-vue';
import { reactive, watch } from 'vue';

const props = defineProps({
  searchForm: {
    type: Object,
    required: true,
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  downloading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'search',
  'refresh',
  'batch-delete',
  'batch-hide',
  'batch-show',
  'batch-move',
  'batch-download',
  'update:searchForm',
]);

// Use a local reactive copy to avoid mutating the incoming prop directly.
const localForm = reactive({ ...props.searchForm });

// Sync prop -> local when parent updates
watch(
  () => props.searchForm,
  (v) => {
    if (v) Object.assign(localForm, v);
  },
  { deep: true }
);

// Emit updates when localForm changes so parent can stay in sync if it listens
watch(
  localForm,
  (v) => {
    emit('update:searchForm', { ...v });
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
.search-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

@media (max-width: 768px) {
  .search-section {
    .el-form {
      flex-direction: column;

      .el-form-item {
        margin-right: 0;
        margin-bottom: 16px;
      }
    }
  }
}
</style>
