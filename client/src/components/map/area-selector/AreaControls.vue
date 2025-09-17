<template>
  <div class="area-controls">
    <div class="status-wrapper" v-if="visiblePointsCount > 0">
      <el-text type="success" size="small">
        <el-icon><CircleCheck /></el-icon>
        已选中 {{ visiblePointsCount }} 个点位
      </el-text>
    </div>

    <div class="buttons-wrapper">
      <el-button-group>
        <el-button
          class="btn-circle"
          :disabled="isDrawing"
          :loading="isDrawingCircle"
          @click="handleCircleAreaClick"
        >
          <el-icon><Compass /></el-icon>
          圆形区域
        </el-button>

        <el-button
          class="btn-custom"
          :disabled="isDrawing"
          :loading="isDrawingPolygon"
          @click="handleCustomAreaClick"
        >
          <el-icon><Crop /></el-icon>
          自定义区域
        </el-button>

        <el-button class="btn-clear" :disabled="areasCount === 0" @click="handleClearAreas">
          <el-icon><Delete /></el-icon>
          清除
        </el-button>

        <el-button v-if="isDrawing" type="primary" @click="handleFinishDrawing"> 完成 </el-button>
      </el-button-group>
    </div>

    <el-dialog v-model="radiusDialogVisible" title="设置圆形区域半径" width="400px" :close-on-click-modal="false">
      <div class="radius-setting">
        <el-form label-width="80px">
          <el-form-item label="半径">
            <el-input-number v-model="tempRadius" :min="50" :max="50000" :step="100" controls-position="right" style="width: 200px" />
            <span style="margin-left: 8px">米</span>
          </el-form-item>
        </el-form>

        <div class="radius-presets">
          <span class="preset-label">常用半径:</span>
          <el-button-group size="small">
            <el-button v-for="preset in radiusPresets" :key="preset" :type="tempRadius === preset ? 'primary' : ''" @click="tempRadius = preset">{{ preset }}m</el-button>
          </el-button-group>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="radiusDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRadiusAndStartDrawing">确定并开始绘制</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Compass, Crop, Delete, CircleCheck } from '@element-plus/icons-vue';
import { useAreaSelector } from '@/composables/use-area-selector.js';
import { useKMLBaseMapStore } from '@/store/kml-basemap.js';

const props = defineProps({
  mapInstance: { type: Object, default: null },
});

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

const store = useKMLBaseMapStore();

const radiusDialogVisible = ref(false);
const tempRadius = ref(1000);
const radiusPresets = [500, 1000, 2000, 5000, 10000];

const visiblePointsCount = computed(() => store.visiblePointsCount);

watch(() => props.mapInstance, (mapInstance) => {
  if (mapInstance) setMapInstance(mapInstance);
}, { immediate: true });

const handleCircleAreaClick = () => {
  tempRadius.value = circleRadius.value;
  radiusDialogVisible.value = true;
};

const confirmRadiusAndStartDrawing = () => {
  if (tempRadius.value < 50 || tempRadius.value > 50000) {
    ElMessage.error('半径应在50-50000米之间');
    return;
  }
  setCircleRadius(tempRadius.value);
  radiusDialogVisible.value = false;
  startCircleSelection();
};

const handleCustomAreaClick = () => startPolygonSelection();
const handleClearAreas = () => clearAllAreas();
const handleFinishDrawing = async () => { await finishDrawing(); };

const _handleRemoveArea = (areaId, areaName) => { removeArea(areaId, areaName); };
void _handleRemoveArea;
</script>

<style lang="scss" scoped>
.area-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.status-wrapper {
  flex: 0 0 auto;
  margin-right: 8px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.buttons-wrapper {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
}

.buttons-wrapper .el-button-group { display: inline-flex; align-items: center; gap: 8px; }

.el-button { display: inline-flex; align-items: center; }
.el-button .el-icon { margin-right: 6px; display: inline-flex; align-items: center; }

.dialog-footer { display:flex; justify-content:flex-end; gap:12px; }

.btn-circle { background:#fb8c00 !important; border-color:#fb8c00 !important; color:#fff !important; }
.btn-custom { background:#fdd835 !important; border-color:#fdd835 !important; color:#333 !important; }
.btn-clear { background:#43a047 !important; border-color:#43a047 !important; color:#fff !important; }
</style>
                          position: relative;
