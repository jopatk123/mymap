<template>
  <div class="search-filter">
    <!-- 搜索框 -->
    <div class="search-section">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索点位..."
        @input="handleSearch"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
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
      keyword: ''
    })
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const searchKeyword = ref(props.modelValue.keyword || '')


// 监听props变化
watch(() => props.modelValue, (newValue) => {
  searchKeyword.value = newValue.keyword || ''
}, { deep: true })

const handleSearch = () => {
  const searchParams = {
    keyword: searchKeyword.value.trim()
  }
  
  emit('update:modelValue', searchParams)
  emit('search', searchParams)
}


</script>

<style lang="scss" scoped>
.search-filter {
  .search-section {
    padding: 16px;
    border-bottom: 1px solid #eee;
  }
}
</style>