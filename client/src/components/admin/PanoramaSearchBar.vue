<template>
  <div class="search-section">
    <el-form :model="searchForm" inline>
      <el-form-item label="关键词">
        <el-input
          v-model="searchForm.keyword"
          placeholder="搜索标题或描述"
          clearable
          @keyup.enter="handleSearch"
        />
      </el-form-item>
      <el-form-item label="显示隐藏">
        <el-switch
          v-model="searchForm.includeHidden"
          active-text="是"
          inactive-text="否"
          @change="handleSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
        <el-button
          type="danger"
          :disabled="selectedCount === 0"
          :loading="loading"
          @click="$emit('batch-delete')"
        >
          <el-icon><Delete /></el-icon>
          删除{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, onUnmounted } from 'vue';
import { debounce } from 'lodash-es';
import { Delete } from '@element-plus/icons-vue';

defineProps({
  selectedCount: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['search', 'reset', 'batch-delete']);

const searchForm = reactive({
  keyword: '',
  includeHidden: true,
});

const handleSearch = () => {
  emit('search', { ...searchForm });
};

const resetSearch = () => {
  searchForm.keyword = '';
  searchForm.includeHidden = false;
  emit('reset');
};

// Debounced auto-search when keyword changes
const emitSearchDebounced = debounce(() => {
  emit('search', { ...searchForm });
}, 300);

// watch reactive object by using a simple interval-free approach: use a Mutation observer via Vue watch is possible,
// but to keep minimal changes, we use a manual reactive watch via setInterval alternative isn't necessary —
// instead, we hook into the input @input handler in template? Simpler: use a watcher on the reactive property by adding
// a small microtask poll — but since <el-input> already updates the reactive property, a Vue watch is cleaner.
// However this file is script-setup; we can use a reactive watcher using import of 'watch' is missing; we keep small change:
import { watch } from 'vue';

watch(
  () => searchForm.keyword,
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
