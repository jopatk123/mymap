<template>
  <div class="search-section">
    <!-- 搜索表单行 -->
    <el-form :model="localForm" inline class="search-form">
      <el-form-item label="文件类型" class="type-select">
        <el-select v-model="localForm.fileType" @change="$emit('search', { ...localForm })">
          <el-option label="全部" value="all" />
          <el-option label="全景图" value="panorama" />
          <el-option label="视频点位" value="video" />
          <el-option label="图片集" value="image-set" />
          <el-option label="KML文件" value="kml" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词" class="keyword-input">
        <el-input
          v-model="localForm.keyword"
          placeholder="搜索标题或描述"
          clearable
          @keyup.enter="$emit('search', { ...localForm })"
        />
      </el-form-item>
      <el-form-item label="显示隐藏" class="hidden-switch">
        <el-switch
          v-model="localForm.includeHidden"
          active-text="是"
          inactive-text="否"
          @change="$emit('search', { ...localForm })"
        />
      </el-form-item>
      <el-form-item label="子文件夹" class="subfolders-switch">
        <el-checkbox
          v-model="localForm.includeSubfolders"
          @change="$emit('search', { ...localForm })"
        >
          包含所有子文件夹内容
        </el-checkbox>
      </el-form-item>
      <el-form-item class="search-buttons">
        <el-button type="primary" @click="$emit('search', { ...localForm })">搜索</el-button>
        <el-button @click="$emit('refresh')">刷新</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作按钮行（移动端单独一行） -->
    <div class="action-buttons">
      <el-button
        type="danger"
        :disabled="selectedCount === 0"
        :loading="loading"
        @click="$emit('batch-delete')"
      >
        <el-icon><Delete /></el-icon>
        <span class="btn-text">删除{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}</span>
      </el-button>
      <el-button :disabled="selectedCount === 0" :loading="loading" @click="$emit('batch-hide')">
        <el-icon><Hide /></el-icon>
        <span class="btn-text">隐藏{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}</span>
      </el-button>
      <el-button
        type="success"
        :disabled="selectedCount === 0"
        :loading="loading"
        @click="$emit('batch-show')"
      >
        <el-icon><View /></el-icon>
        <span class="btn-text">显示{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}</span>
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedCount === 0"
        :loading="loading"
        @click="$emit('batch-move')"
      >
        <el-icon><FolderOpened /></el-icon>
        <span class="btn-text">移动</span>
      </el-button>
      <el-dropdown
        trigger="click"
        @command="
          (cmd) =>
            cmd === 'download-selected'
              ? $emit('batch-download')
              : cmd === 'download-stats'
              ? $emit('batch-download-stats')
              : cmd === 'download-all'
              ? $emit('batch-download-all')
              : cmd === 'download-stats-all'
              ? $emit('batch-download-stats-all')
              : null
        "
      >
        <el-button type="info" :loading="downloading">
          <el-icon><Download /></el-icon>
          <span class="btn-text">下载{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}</span>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="download-selected" :disabled="selectedCount === 0">
              <el-icon><Download /></el-icon>
              下载选中文件
            </el-dropdown-item>
            <el-dropdown-item command="download-stats" :disabled="selectedCount === 0">
              <el-icon><Download /></el-icon>
              下载表格统计
            </el-dropdown-item>
            <el-dropdown-item command="download-all" divided>
              <el-icon><Download /></el-icon>
              下载全部文件
            </el-dropdown-item>
            <el-dropdown-item command="download-stats-all">
              <el-icon><Download /></el-icon>
              下载全部表格统计
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { Delete, Hide, FolderOpened, View, Download } from '@element-plus/icons-vue';
import { reactive, watch, onUnmounted } from 'vue';
import { debounce } from 'lodash-es';

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
  'batch-download-stats',
  'batch-download-all',
  'batch-download-stats-all',
  'update:search-form',
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
    emit('update:search-form', { ...v });
  },
  { deep: true }
);

// Debounced auto-search when keyword changes (improves UX so user doesn't need to press Enter)
const emitSearchDebounced = debounce(() => {
  emit('search', { ...localForm });
}, 300);

watch(
  () => localForm.keyword,
  () => {
    emitSearchDebounced();
  }
);

onUnmounted(() => {
  emitSearchDebounced.cancel && emitSearchDebounced.cancel();
});
</script>

<style lang="scss" scoped>
.search-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .search-section {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .search-form {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .el-form-item {
      margin-right: 0;
      margin-bottom: 0;

      :deep(.el-form-item__label) {
        font-size: 12px;
        padding-bottom: 4px;
      }
    }

    .type-select {
      grid-column: 1;
    }

    .keyword-input {
      grid-column: 2;
    }

    .hidden-switch {
      grid-column: 1;
    }

    .subfolders-switch {
      grid-column: 2;
    }

    .search-buttons {
      grid-column: 2;
      display: flex;
      gap: 8px;

      :deep(.el-form-item__content) {
        display: flex;
        gap: 8px;
      }
    }

    :deep(.el-select),
    :deep(.el-input) {
      width: 100%;
    }
  }

  .action-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    .el-button {
      padding: 8px 12px;
      font-size: 12px;

      .btn-text {
        display: none;
      }

      .el-icon {
        margin-right: 0;
      }
    }

    .el-dropdown {
      .el-button {
        width: 100%;
      }
    }
  }
}

@media (max-width: 480px) {
  .search-form {
    grid-template-columns: 1fr;

    .type-select,
    .keyword-input,
    .hidden-switch,
    .subfolders-switch,
    .search-buttons {
      grid-column: 1;
    }
  }

  .action-buttons {
    grid-template-columns: repeat(3, 1fr);

    .el-button {
      padding: 8px;
      min-width: auto;
    }
  }
}
</style>
