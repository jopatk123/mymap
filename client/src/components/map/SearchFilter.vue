<template>
  <div class="search-filter">
    <div class="search-section">
      <el-radio-group v-model="searchMode" size="small">
        <el-radio-button label="point">点位搜索</el-radio-button>
        <el-radio-button label="address">地址搜索</el-radio-button>
      </el-radio-group>
      <div class="search-input">
        <el-input
          v-model="searchKeyword"
          :placeholder="searchMode === 'point' ? '搜索点位...' : '搜索地址（高德）...'
          "
          @input="handleInput"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 地址联想结果 -->
      <el-scrollbar v-if="searchMode === 'address' && tips.length > 0" class="tips-list">
        <div
          v-for="tip in tips"
          :key="tip.id || tip.uid || tip.name + tip.district"
          class="tip-item"
          @click="selectTip(tip)"
        >
          <div class="title">{{ tip.name }}</div>
          <div class="desc">{{ tip.district }} {{ tip.address }}</div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { debounce } from 'lodash-es'
import { amapApi } from '@/api/amap.js'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      keyword: ''
    })
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'locate'])

const searchKeyword = ref(props.modelValue.keyword || '')
const searchMode = ref('point')
const tips = ref([])


// 监听props变化
watch(() => props.modelValue, (newValue) => {
  searchKeyword.value = newValue.keyword || ''
}, { deep: true })

const runPointSearch = () => {
  const searchParams = { keyword: searchKeyword.value.trim() }
  emit('update:modelValue', searchParams)
  emit('search', searchParams)
}

const runAddressTips = async () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) { tips.value = []; return }
  try {
    const { tips: result } = await amapApi.inputTips(keyword)
    // 仅保留带坐标或有 location 的项
    tips.value = (result || []).filter(t => t.location || (t.location && t.location.split(',').length === 2))
  } catch (e) {
    tips.value = []
  }
}

const handleInput = debounce(() => {
  if (searchMode.value === 'point') {
    runPointSearch()
  } else {
    runAddressTips()
  }
}, 300)

const selectTip = (tip) => {
  // tip.location 为 "lng,lat"
  if (!tip?.location) return
  const [lngStr, latStr] = tip.location.split(',')
  const lng = parseFloat(lngStr)
  const lat = parseFloat(latStr)
  if (isNaN(lng) || isNaN(lat)) return
  emit('locate', { lat, lng, tip })
  tips.value = []
}


</script>

<style lang="scss" scoped>
.search-filter {
  .search-section {
    padding: 16px;
    border-bottom: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .search-input {
    width: 100%;
  }
  .tips-list {
    max-height: 220px;
    border: 1px solid #eee;
    border-radius: 6px;
    background: #fff;
  }
  .tip-item {
    padding: 8px 12px;
    cursor: pointer;
    .title { font-weight: 500; color: #303133; }
    .desc { font-size: 12px; color: #909399; margin-top: 2px; }
  }
  .tip-item:hover {
    background: #f5f7fa;
  }
}
</style>