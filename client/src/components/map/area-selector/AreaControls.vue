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
  // debug: 圆形区域按钮被点击
  tempRadius.value = circleRadius.value;
  radiusDialogVisible.value = true;
  // debug: 半径对话框状态已切换
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
  height: 44px;
}

.status-wrapper {
  position: absolute;
  top: -28px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  white-space: nowrap;
  font-size: 12px;
  z-index: 1001;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.buttons-wrapper {
  display: inline-flex;
  align-items: center;
  height: 44px;
}

.buttons-wrapper .el-button-group {
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 44px;
}

.el-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px !important;
  min-width: 88px;
  padding: 0 14px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 0 !important;
  border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  opacity: 1 !important;
  white-space: nowrap;
  
  &:last-child {
    border-right: none !important;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    z-index: 1;
    opacity: 1 !important;
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(-1px);
    opacity: 1 !important;
    transition: all 0.1s ease;
  }

  &:focus {
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2) !important;
    opacity: 1 !important;
  }
}

.el-button .el-icon {
  margin-right: 6px;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 按钮颜色使用渐变效果 */
.btn-circle {
  background: linear-gradient(135deg, #ff9800, #f57c00) !important;
  border-color: #ff9800 !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.btn-custom {
  background: linear-gradient(135deg, #ffeb3b, #fbc02d) !important;
  border-color: #ffeb3b !important;
  color: #424242 !important;
  box-shadow: 0 2px 8px rgba(255, 235, 59, 0.3);
}

.btn-clear {
  background: linear-gradient(135deg, #4caf50, #388e3c) !important;
  border-color: #4caf50 !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .area-controls {
    .el-button {
      min-width: 76px;
      padding: 0 10px !important;
      font-size: 12px !important;

      .el-icon {
        margin-right: 4px;
        font-size: 14px;
      }
    }
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .area-controls {
    height: 40px;
  }

  .status-wrapper {
    top: -24px;
    font-size: 11px;
    padding: 1px 6px;
  }

  .buttons-wrapper {
    height: 40px;
  }

  .buttons-wrapper .el-button-group {
    height: 40px;
  }

  .el-button {
    height: 40px !important;
    min-width: 80px;
    max-width: 120px;
    padding: 0 10px !important;
    font-size: 12px !important;
    border-radius: 8px !important;
    border-right: none !important;
    margin: 0 2px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  }

  .el-button .el-icon {
    margin-right: 3px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .area-controls {
    height: 36px;
  }

  .status-wrapper {
    top: -22px;
    font-size: 10px;
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
    font-size: 11px !important;
  }

  .el-button .el-icon {
    margin-right: 2px;
    font-size: 12px;
  }
}

/* 超宽屏幕优化 */
@media (min-width: 1440px) {
  .area-controls {
    .el-button {
      min-width: 96px;
      padding: 0 16px !important;
      font-size: 14px !important;

      .el-icon {
        margin-right: 8px;
        font-size: 16px;
      }
    }
  }
}
</style>
