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
          :loading="isDrawingCircle"
          @click.stop="handleCircleAreaClick"
          style="pointer-events: auto !important; z-index: 1000 !important;"
        >
          <el-icon><Compass /></el-icon>
          圆形区域
        </el-button>

        <el-button
          class="btn-custom"
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

    <el-dialog 
      v-model="radiusDialogVisible" 
      title="设置圆形区域半径" 
      width="400px" 
      :close-on-click-modal="false"
      :z-index="2000"
      :append-to-body="true"
    >
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
  console.log('圆形区域按钮被点击，当前状态:', radiusDialogVisible.value);
  tempRadius.value = circleRadius.value;
  radiusDialogVisible.value = true;
  console.log('半径对话框状态已切换为:', radiusDialogVisible.value);
};

const confirmRadiusAndStartDrawing = () => {
  if (tempRadius.value < 50 || tempRadius.value > 50000) {
    ElMessage.error({ message: '半径应在50-50000米之间', duration: 1000 });
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
  display: inline-flex;
  align-items: center;
  gap: 0;
  position: relative;
  height: 40px;
}

.status-wrapper {
  position: absolute;
  top: -25px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  white-space: nowrap;
  font-size: 12px;
  z-index: 1001;
}

.buttons-wrapper {
  display: inline-flex;
  align-items: center;
  height: 40px;
}

.buttons-wrapper .el-button-group {
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 40px;
}

.el-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px !important;
  min-width: 80px;
  padding: 0 12px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 0 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all 0.2s ease !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  opacity: 1 !important;
  
  &:last-child {
    border-right: none !important;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1;
    opacity: 1 !important;
  }

  &:active {
    transform: translateY(0);
    opacity: 1 !important;
  }

  &:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
    opacity: 1 !important;
  }
}

.el-button .el-icon {
  margin-right: 4px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 按钮颜色保持不变 */
.btn-circle {
  background: #fb8c00 !important;
  border-color: #fb8c00 !important;
  color: #fff !important;
}

.btn-custom {
  background: #fdd835 !important;
  border-color: #fdd835 !important;
  color: #333 !important;
}

.btn-clear {
  background: #43a047 !important;
  border-color: #43a047 !important;
  color: #fff !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .area-controls {
    height: 36px;
  }

  .status-wrapper {
    top: -20px;
    font-size: 11px;
  }

  .buttons-wrapper {
    height: 36px;
  }

  .buttons-wrapper .el-button-group {
    height: 36px;
  }

  .el-button {
    height: 36px !important;
    min-width: 70px;
    padding: 0 8px !important;
    font-size: 12px !important;
  }

  .el-button .el-icon {
    margin-right: 2px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .el-button {
    min-width: 60px;
    padding: 0 6px !important;
    font-size: 11px !important;
  }

  .el-button .el-icon {
    margin-right: 1px;
  }
}
</style>
