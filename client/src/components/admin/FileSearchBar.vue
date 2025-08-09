<template>
  <div class="search-section">
    <el-form :model="searchForm" inline>
      <el-form-item label="文件类型">
        <el-select v-model="searchForm.fileType" @change="$emit('search')">
          <el-option label="全部" value="all" />
          <el-option label="全景图" value="panorama" />
          <el-option label="视频点位" value="video" />
          <el-option label="KML文件" value="kml" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input
          v-model="searchForm.keyword"
          placeholder="搜索标题或描述"
          @keyup.enter="$emit('search')"
          clearable
        />
      </el-form-item>
      <el-form-item label="显示隐藏">
        <el-switch
          v-model="searchForm.includeHidden"
          active-text="是"
          inactive-text="否"
          @change="$emit('search')"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="$emit('search')" type="primary">搜索</el-button>
        <el-button @click="$emit('reset')">重置</el-button>
        <el-button 
          @click="$emit('batch-delete')" 
          type="danger" 
          :disabled="selectedCount === 0"
          :loading="loading"
        >
          <el-icon><Delete /></el-icon>
          删除{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue'

const props = defineProps({
  searchForm: {
    type: Object,
    required: true
  },
  selectedCount: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['search', 'reset', 'batch-delete'])
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