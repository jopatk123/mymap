<template>
  <div class="search-filter">
    <!-- 搜索框 -->
    <div class="search-section">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索全景图..."
        @input="handleSearch"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>
    
    <!-- 筛选选项 -->
    <div class="filter-section">
      <el-select
        v-model="sortBy"
        placeholder="排序方式"
        @change="handleSortChange"
        style="width: 100%"
      >
        <el-option label="创建时间" value="createdAt" />
        <el-option label="标题" value="title" />
        <el-option label="距离" value="distance" />
      </el-select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      keyword: '',
      sortBy: 'createdAt'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'sort-change'])

const searchKeyword = ref(props.modelValue.keyword || '')
const sortBy = ref(props.modelValue.sortBy || 'createdAt')

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  searchKeyword.value = newValue.keyword || ''
  sortBy.value = newValue.sortBy || 'createdAt'
}, { deep: true })

const handleSearch = () => {
  const searchParams = {
    keyword: searchKeyword.value.trim(),
    sortBy: sortBy.value
  }
  
  emit('update:modelValue', searchParams)
  emit('search', searchParams)
}

const handleSortChange = () => {
  const searchParams = {
    keyword: searchKeyword.value.trim(),
    sortBy: sortBy.value
  }
  
  emit('update:modelValue', searchParams)
  emit('sort-change', searchParams)
}
</script>

<style lang="scss" scoped>
.search-filter {
  .search-section {
    padding: 16px;
    border-bottom: 1px solid #eee;
  }
  
  .filter-section {
    padding: 0 16px 16px;
    border-bottom: 1px solid #eee;
  }
}
</style>