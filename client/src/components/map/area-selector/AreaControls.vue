<template>
  <div class="area-controls">
    <el-button-group>
      <!-- 圆形区域按钮 -->
      <el-button
        @click="handleCircleAreaClick"
        type="success"
        :disabled="isDrawing"
        :loading="isDrawingCircle"
      >
        <el-icon><Compass /></el-icon>
        圆形区域
      </el-button>

      <!-- 自定义区域按钮 -->
      <el-button
        @click="handleCustomAreaClick"
        type="success"
        :disabled="isDrawing"
        :loading="isDrawingPolygon"
      >
        <el-icon><Crop /></el-icon>
        自定义区域
      </el-button>

      <!-- 清除按钮 -->
      <el-button
        @click="handleClearAreas"
        type="danger"
        :disabled="areasCount === 0"
      >
        <el-icon><Delete /></el-icon>
        清除
      </el-button>

      <!-- 导出按钮 -->
      <el-button
        @click="handleExport"
        type="warning"
        :disabled="!hasExportableData"
        :loading="exporting"
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
              @click="tempRadius = preset"
              :type="tempRadius === preset ? 'primary' : ''"
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
        @close="removeArea(area.id, area.name)"
        style="margin-right: 8px; margin-bottom: 4px;"
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
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Compass,
  Crop,
  Delete,
  Download,
  CircleCheck
} from '@element-plus/icons-vue'
import { useAreaSelector } from '@/composables/use-area-selector.js'
import { useKMLExport } from '@/composables/use-kml-export.js'
import { useKMLBaseMapStore } from '@/store/kml-basemap.js'

// Props
const props = defineProps({
  mapInstance: {
    type: Object,
    default: null
  }
})

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
  clearAllAreas,
  removeArea,
  setCircleRadius
} = useAreaSelector()

const {
  exporting,
  hasExportableData,
  openExportDialog
} = useKMLExport()

const store = useKMLBaseMapStore()

// 本地状态
const radiusDialogVisible = ref(false)
const tempRadius = ref(1000)
const radiusPresets = [500, 1000, 2000, 5000, 10000]

// 计算属性
const visiblePointsCount = computed(() => store.visiblePointsCount)

// 监听地图实例变化
watch(() => props.mapInstance, (mapInstance) => {
  if (mapInstance) {
    setMapInstance(mapInstance)
  }
}, { immediate: true })

// 处理圆形区域点击
const handleCircleAreaClick = () => {
  tempRadius.value = circleRadius.value
  radiusDialogVisible.value = true
}

// 确认半径并开始绘制
const confirmRadiusAndStartDrawing = () => {
  if (tempRadius.value < 50 || tempRadius.value > 50000) {
    ElMessage.error('半径应在50-50000米之间')
    return
  }
  
  setCircleRadius(tempRadius.value)
  radiusDialogVisible.value = false
  startCircleSelection()
}

// 处理自定义区域点击
const handleCustomAreaClick = () => {
  startPolygonSelection()
}

// 处理清除区域
const handleClearAreas = () => {
  clearAllAreas()
}

// 处理导出
const handleExport = () => {
  openExportDialog()
}

// 获取区域标签类型
const getAreaTagType = (type) => {
  return type === 'circle' ? 'success' : 'warning'
}

// 获取区域详情文本
const getAreaDetail = (area) => {
  if (area.type === 'circle') {
    return `(半径: ${area.radius}m)`
  } else {
    return `(${area.polygon.length}个点)`
  }
}

// 删除区域
const handleRemoveArea = (areaId, areaName) => {
  removeArea(areaId, areaName)
}
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
</style>
