<template>
  <div class="search-tool">
    <!-- 搜索按钮 -->
    <el-button type="primary" :icon="Search" title="综合搜索" @click="toggleSearchDialog">
      搜索
    </el-button>

    <!-- 搜索对话框 -->
    <el-dialog
      v-model="showSearchDialog"
      title="综合搜索"
      width="500px"
      :before-close="handleClose"
    >
      <div class="search-content">
        <!-- 搜索类型选择 -->
        <div class="search-type-tabs">
          <el-radio-group v-model="searchType" size="small">
            <el-radio-button value="kml">KML点位搜索</el-radio-button>
            <el-radio-button value="address">地址搜索</el-radio-button>
          </el-radio-group>
        </div>

        <!-- KML点位搜索 -->
        <div v-if="searchType === 'kml'" class="search-section">
          <div class="search-input-section">
            <el-input
              v-model="kmlSearchKeyword"
              placeholder="搜索KML点位名称或描述..."
              clearable
              @input="handleKMLSearchInput"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- KML搜索结果 -->
          <div v-if="kmlResults.length > 0" class="search-results">
            <div class="results-header">
              <span class="results-count">找到 {{ kmlResults.length }} 个KML点位</span>
            </div>
            <el-scrollbar max-height="300px">
              <div
                v-for="result in kmlResults"
                :key="result.id"
                class="result-item kml-result-item"
                @click="selectKMLResult(result)"
              >
                <div class="result-title">
                  <el-icon><Location /></el-icon>
                  <span class="highlight-text">
                    <template
                      v-for="(part, idx) in safeHighlight(result.name, kmlSearchKeyword)"
                      :key="idx"
                    >
                      <mark v-if="part.isMatch">{{ part.text }}</mark>
                      <span v-else>{{ part.text }}</span>
                    </template>
                  </span>
                </div>
                <div v-if="result.description" class="result-description">
                  <span class="highlight-text">
                    <template
                      v-for="(part, idx) in safeHighlight(result.description, kmlSearchKeyword)"
                      :key="idx"
                    >
                      <mark v-if="part.isMatch">{{ part.text }}</mark>
                      <span v-else>{{ part.text }}</span>
                    </template>
                  </span>
                </div>
                <div class="result-meta">
                  <span class="source-file">{{ result.sourceFile }}</span>
                  <span class="coordinates"
                    >{{ result.latitude.toFixed(6) }}, {{ result.longitude.toFixed(6) }}</span
                  >
                </div>
              </div>
            </el-scrollbar>
          </div>

          <!-- KML搜索无结果 -->
          <div v-else-if="kmlSearchKeyword && !kmlSearching" class="no-results">
            <el-empty :image-size="80" description="未找到匹配的KML点位" />
          </div>

          <!-- KML搜索加载状态 -->
          <div v-if="kmlSearching" class="search-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>搜索中...</span>
          </div>
        </div>

        <!-- 地址搜索 -->
        <div v-else-if="searchType === 'address'" class="search-section">
          <div class="search-input-section">
            <el-input
              v-model="addressSearchKeyword"
              placeholder="搜索地址（高德地图）..."
              clearable
              @input="handleAddressSearchInput"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- 地址搜索结果 -->
          <div v-if="addressResults.length > 0" class="search-results">
            <div class="results-header">
              <span class="results-count">找到 {{ addressResults.length }} 个地址</span>
            </div>
            <el-scrollbar max-height="300px">
              <div
                v-for="tip in addressResults"
                :key="tip.id || tip.uid || tip.name + tip.district"
                class="result-item address-result-item"
                @click="selectAddressResult(tip)"
              >
                <div class="result-title">
                  <el-icon><Place /></el-icon>
                  {{ tip.name }}
                </div>
                <div class="result-description">{{ tip.district }} {{ tip.address }}</div>
              </div>
            </el-scrollbar>
          </div>

          <!-- 地址搜索无结果 -->
          <div v-else-if="addressSearchKeyword && !addressSearching" class="no-results">
            <el-empty :image-size="80" description="未找到匹配的地址" />
          </div>

          <!-- 地址搜索加载状态 -->
          <div v-if="addressSearching" class="search-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>搜索中...</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Search, Location, Place, Loading } from '@element-plus/icons-vue';
import { debounce } from 'lodash-es';
import { ElMessage } from 'element-plus';
import { amapApi } from '@/api/amap.js';
import { kmlSearchApi } from '@/api/kml-search.js';

const emit = defineEmits(['locate-kml-point', 'locate-address']);

// 状态管理
const showSearchDialog = ref(false);
const searchType = ref('kml');

// KML搜索相关
const kmlSearchKeyword = ref('');
const kmlResults = ref([]);
const kmlSearching = ref(false);

// 地址搜索相关
const addressSearchKeyword = ref('');
const addressResults = ref([]);
const addressSearching = ref(false);

// 切换搜索对话框
const toggleSearchDialog = () => {
  showSearchDialog.value = !showSearchDialog.value;
  if (showSearchDialog.value) {
    // 重置搜索状态
    resetSearch();
  }
};

// 重置搜索状态
const resetSearch = () => {
  kmlSearchKeyword.value = '';
  kmlResults.value = [];
  kmlSearching.value = false;
  addressSearchKeyword.value = '';
  addressResults.value = [];
  addressSearching.value = false;
};

// 关闭对话框处理
const handleClose = () => {
  resetSearch();
  showSearchDialog.value = false;
};

// KML搜索输入处理
const handleKMLSearchInput = debounce(() => {
  searchKMLPoints();
}, 300);

// 执行KML搜索
const searchKMLPoints = async () => {
  const keyword = kmlSearchKeyword.value.trim();
  if (!keyword) {
    kmlResults.value = [];
    return;
  }

  try {
    kmlSearching.value = true;
    const response = await kmlSearchApi.searchKMLPoints(keyword);

    if (response.success) {
      // debug: 打印返回结果，便于定位无结果问题
      console.debug('[KML Search] response:', response);
      kmlResults.value = response.data || [];
    } else {
      console.error('KML搜索失败:', response.message);
      kmlResults.value = [];
      ElMessage.error(response.message || 'KML搜索失败');
    }
  } catch (error) {
    console.error('KML搜索出错:', error);
    kmlResults.value = [];
    ElMessage.error(error.message || 'KML搜索出错');
  } finally {
    kmlSearching.value = false;
  }
};

// 地址搜索输入处理
const handleAddressSearchInput = debounce(() => {
  searchAddresses();
}, 300);

// 执行地址搜索
const searchAddresses = async () => {
  const keyword = addressSearchKeyword.value.trim();
  if (!keyword) {
    addressResults.value = [];
    return;
  }

  try {
    addressSearching.value = true;
    const response = await amapApi.inputTips(keyword);

    // 过滤出有坐标的地址
    const tips = (response.tips || []).filter(
      (tip) => tip.location && tip.location.split(',').length === 2
    );

    addressResults.value = tips;
  } catch (error) {
    console.error('地址搜索出错:', error);
    addressResults.value = [];
    ElMessage.error(error.message || '地址搜索出错');
  } finally {
    addressSearching.value = false;
  }
};

// 选择KML搜索结果
const selectKMLResult = (result) => {
  emit('locate-kml-point', {
    lat: result.latitude,
    lng: result.longitude,
    point: result,
  });
  showSearchDialog.value = false;
  ElMessage.success(`已定位到：${result.name}`);
};

// 选择地址搜索结果
const selectAddressResult = (tip) => {
  if (!tip.location) return;

  const [lngStr, latStr] = tip.location.split(',');
  const lng = parseFloat(lngStr);
  const lat = parseFloat(latStr);

  if (isNaN(lng) || isNaN(lat)) return;

  emit('locate-address', { lat, lng, tip });
  showSearchDialog.value = false;
  ElMessage.success(`已定位到：${tip.name}`);
};

// 将文本按关键字分割为安全的片段数组 { text, isMatch }
const safeHighlight = (text, keyword) => {
  if (!text || !keyword) return [{ text, isMatch: false }];

  // 对 keyword 做转义，避免 regex 注入
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${esc(keyword)})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) {
      parts.push({ text: text.substring(lastIndex, idx), isMatch: false });
    }
    parts.push({ text: match[0], isMatch: true });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isMatch: false });
  }
  return parts;
};

// 监听搜索类型变化，重置搜索状态
watch(searchType, () => {
  resetSearch();
});
</script>

<style lang="scss" scoped>
.search-tool {
  display: inline-block;
}

.search-content {
  .search-type-tabs {
    margin-bottom: 16px;
    text-align: center;
  }

  .search-section {
    .search-input-section {
      margin-bottom: 16px;
    }

    .search-results {
      .results-header {
        padding: 8px 0;
        border-bottom: 1px solid #eee;
        margin-bottom: 8px;

        .results-count {
          font-size: 14px;
          color: #666;
        }
      }

      .result-item {
        padding: 12px;
        border: 1px solid #eee;
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: #409eff;
          background-color: #f0f8ff;
        }

        .result-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          color: #303133;
          margin-bottom: 4px;

          .el-icon {
            color: #409eff;
          }
        }

        .result-description {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .result-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #999;

          .source-file {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
          }
        }
      }
    }

    .no-results {
      text-align: center;
      padding: 40px 20px;
    }

    .search-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      color: #666;
    }
  }
}

// 高亮样式
:deep(mark) {
  background-color: #fff3cd;
  color: #856404;
  padding: 1px 2px;
  border-radius: 2px;
}
</style>
