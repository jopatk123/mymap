<template>
  <div class="search-tool">
    <!-- 搜索按钮 -->
    <el-button
      type="primary"
      title="综合搜索"
      style="pointer-events: auto !important; z-index: 1000 !important"
      @click.stop="toggleSearchDialog"
    >
      搜索
    </el-button>

    <!-- 搜索对话框 -->
    <el-dialog
      v-model="showSearchDialog"
      title="综合搜索"
      width="500px"
      :before-close="handleClose"
      :modal="true"
      :close-on-click-modal="false"
      :z-index="2000"
      :append-to-body="true"
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
import { useHighlight } from '@/composables/use-highlight.js';

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

const { safeHighlight } = useHighlight();

// 切换搜索对话框
const toggleSearchDialog = () => {
  // debug: 搜索按钮被点击（状态切换）
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
      // debug logging removed
      kmlResults.value = response.data || [];
    } else {
      void console.error('KML搜索失败:', response.message);
      kmlResults.value = [];
      ElMessage.error({ message: response.message || 'KML搜索失败', duration: 1000 });
    }
  } catch (error) {
    void console.error('KML搜索出错:', error);
    kmlResults.value = [];
    ElMessage.error({ message: error.message || 'KML搜索出错', duration: 1000 });
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
    const tips = (response.tips || []).filter((tip) => {
      // only accept string locations like "lng,lat"
      if (!tip || !tip.location) return false;
      if (typeof tip.location !== 'string') return false;
      const parts = tip.location.split(',');
      return parts.length === 2 && parts[0].trim() !== '' && parts[1].trim() !== '';
    });

    addressResults.value = tips;
  } catch (error) {
    void console.error('地址搜索出错:', error);
    addressResults.value = [];
    ElMessage.error({ message: error.message || '地址搜索出错', duration: 1000 });
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
  ElMessage.success({ message: `已定位到：${result.name}`, duration: 1000 });
};

// 选择地址搜索结果
const selectAddressResult = (tip) => {
  if (!tip || !tip.location || typeof tip.location !== 'string') return;

  const parts = tip.location.split(',');
  if (parts.length !== 2) return;

  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  if (isNaN(lng) || isNaN(lat)) return;

  emit('locate-address', { lat, lng, tip });
  showSearchDialog.value = false;
  ElMessage.success({ message: `已定位到：${tip.name}`, duration: 1000 });
};

// 监听搜索类型变化，重置搜索状态
watch(searchType, () => {
  resetSearch();
});
</script>

<style lang="scss" src="./SearchTool.scss" scoped></style>
