<template>
  <div class="area-controls">
    <el-button-group>
      <!-- 圆形区域按钮 -->
      <el-button
        class="btn-circle"
        :disabled="isDrawing"
        :loading="isDrawingCircle"
        @click="handleCircleAreaClick"
      >
        <el-icon><Compass /></el-icon>
        圆形区域
      </el-button>

      <!-- 自定义区域按钮 -->
      <el-button
        class="btn-custom"
        :disabled="isDrawing"
        :loading="isDrawingPolygon"
        @click="handleCustomAreaClick"
      >
        <el-icon><Crop /></el-icon>
        自定义区域
      </el-button>

      <!-- 清除按钮 -->
      <el-button class="btn-clear" :disabled="areasCount === 0" @click="handleClearAreas">
        <el-icon><Delete /></el-icon>
        清除
      </el-button>

      <!-- 完成绘制按钮（绘制中显示） -->
      <el-button v-if="isDrawing" type="primary" @click="handleFinishDrawing"> 完成 </el-button>

      <!-- 导出按钮 -->
      <el-button
        class="btn-export"
        :disabled="!hasExportableData"
        :loading="exporting"
        @click="handleExport"
      >
        <el-icon><Download /></el-icon>
        导出
      </el-button>
    </el-button-group>

    <!-- 圆形半径设置对话框 -->
    <el-dialog
      v-model="radiusDialogVisible"
      title="设置圆形区域半径"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="radius-setting">
        <el-form label-width="80px">
          <el-form-item label="半径">
            <el-input-number
              v-model="tempRadius"
              :min="50"
              :max="50000"
              :step="100"
              controls-position="right"
              style="width: 200px"
            />
            <span style="margin-left: 8px">米</span>
          </el-form-item>
        </el-form>

        <div class="radius-presets">
          <span class="preset-label">常用半径:</span>
          <el-button-group size="small">
            <el-button
              v-for="preset in radiusPresets"
              :key="preset"
              :type="tempRadius === preset ? 'primary' : ''"
              @click="tempRadius = preset"
            >
              {{ preset }}m
            </el-button>
          </el-button-group>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="radiusDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRadiusAndStartDrawing">
            确定并开始绘制
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 区域列表显示 -->
    <div v-if="areasCount > 0" class="areas-info">
      <el-tag
        v-for="area in areas"
        :key="area.id"
        :type="getAreaTagType(area.type)"
        size="small"
        closable
        style="margin-right: 8px; margin-bottom: 4px"
        @close="removeArea(area.id, area.name)"
      >
        {{ area.name }}
        <span class="area-detail">
          {{ getAreaDetail(area) }}
        </span>
      </el-tag>
    </div>

    <!-- 状态信息 -->
    <div v-if="hasExportableData" class="status-info">
      <el-text type="success" size="small">
        <el-icon><CircleCheck /></el-icon>
        已选中 {{ visiblePointsCount }} 个点位
      </el-text>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Compass, Crop, Delete, Download, CircleCheck } from '@element-plus/icons-vue';
import { useAreaSelector } from '@/composables/use-area-selector.js';
import { useKMLExport } from '@/composables/use-kml-export.js';
import { useKMLBaseMapStore } from '@/store/kml-basemap.js';

// Props
const props = defineProps({
  mapInstance: {
    type: Object,
    default: null,
  },
});

// 使用组合式函数
const {
  circleRadius,
  isDrawingCircle,
  isDrawingPolygon,
  isDrawing,
  areas,
  areasCount,
  setMapInstance,
  startCircleSelection,
  startPolygonSelection,
  finishDrawing,
  clearAllAreas,
  removeArea,
  setCircleRadius,
} = useAreaSelector();

const { exporting, hasExportableData, openExportDialog } = useKMLExport();

const store = useKMLBaseMapStore();

// 本地状态
const radiusDialogVisible = ref(false);
const tempRadius = ref(1000);
const radiusPresets = [500, 1000, 2000, 5000, 10000];

// 计算属性
const visiblePointsCount = computed(() => store.visiblePointsCount);

// 监听地图实例变化
watch(
  () => props.mapInstance,
  (mapInstance) => {
    if (mapInstance) {
      setMapInstance(mapInstance);
    }
  },
  { immediate: true }
);

// 处理圆形区域点击
const handleCircleAreaClick = () => {
  tempRadius.value = circleRadius.value;
  radiusDialogVisible.value = true;
};

// 确认半径并开始绘制
const confirmRadiusAndStartDrawing = () => {
  if (tempRadius.value < 50 || tempRadius.value > 50000) {
    ElMessage.error('半径应在50-50000米之间');
    return;
  }

  setCircleRadius(tempRadius.value);
  radiusDialogVisible.value = false;
  startCircleSelection();
};

// 处理自定义区域点击
const handleCustomAreaClick = () => {
  startPolygonSelection();
};

// 处理清除区域
const handleClearAreas = () => {
  clearAllAreas();
};

const handleFinishDrawing = async () => {
  await finishDrawing();
};

// 处理导出
const handleExport = () => {
  openExportDialog();
};

// 获取区域标签类型
const getAreaTagType = (type) => {
  return type === 'circle' ? 'success' : 'warning';
};

// 获取区域详情文本
const getAreaDetail = (area) => {
  if (area.type === 'circle') {
    return `(半径: ${area.radius}m)`;
  } else {
    return `(${area.polygon.length}个点)`;
  }
};

// 删除区域函数已通过在模板中直接使用 removeArea 来调用；保留此适配器仅作兼容
const _handleRemoveArea = (areaId, areaName) => {
  removeArea(areaId, areaName);
};
// mark intentionally unused helper as referenced to satisfy linter
void _handleRemoveArea;
</script>

<style lang="scss" scoped>
.area-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .areas-info {
    margin-top: 8px;

    .area-detail {
      margin-left: 4px;
      opacity: 0.8;
      font-size: 11px;
    }
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }
}

.radius-setting {
  .radius-presets {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    .preset-label {
      color: #606266;
      font-size: 14px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Button color mappings per design */
.btn-circle {
  background: #fb8c00 !important; /* 橙色 */
  border-color: #fb8c00 !important;
  color: #fff !important;
}

.btn-custom {
  background: #fdd835 !important; /* 黄色 */
  border-color: #fdd835 !important;
  color: #333 !important;
}

.btn-clear {
  background: #43a047 !important; /* 绿色 */
  border-color: #43a047 !important;
  color: #fff !important;
}

.btn-export {
  background: #00acc1 !important; /* 青色 */
  border-color: #00acc1 !important;
  color: #fff !important;
}

/* Ensure grouped buttons visually align when embedded in MapControls */
.area-controls-inline {
  display: inline-flex;
  align-items: center;
}
</style>
