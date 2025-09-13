<template>
  <div class="map-controls">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button-group>
        <el-button 
          @click="togglePanoramaList" 
          type="primary"
          :icon="panoramaListVisible ? Hide : View"
          :title="panoramaListVisible ? '隐藏点位列表' : '显示点位列表'"
        >
          {{ panoramaListVisible ? '隐藏列表' : '显示列表' }}
        </el-button>

        <el-button 
          @click="toggleKmlLayers" 
          type="warning"
          :icon="kmlLayersVisible ? Hide : View"
          :title="kmlLayersVisible ? '隐藏KML图层' : '显示KML图层'"
        >
          {{ kmlLayersVisible ? '隐藏KML图层' : '显示KML图层' }}
        </el-button>

        <!-- 新增的4个按钮 -->
        <el-button
          @click="handleCircleAreaClick"
          type="success"
          :disabled="isDrawing"
          :loading="isDrawingCircle"
          title="选择圆形区域"
        >
          <el-icon><Compass /></el-icon>
          圆形区域
        </el-button>

        <el-button
          @click="handleCustomAreaClick"
          type="success"
          :disabled="isDrawing"
          :loading="isDrawingPolygon"
          title="选择自定义区域"
        >
          <el-icon><Crop /></el-icon>
          自定义区域
        </el-button>

        <el-button
          @click="handleClearAreas"
          type="danger"
          :disabled="areasCount === 0"
          title="清除所有区域"
        >
          <el-icon><Delete /></el-icon>
          清除
        </el-button>

        <el-button
          v-if="isDrawing"
          @click="handleFinishDrawing"
          type="primary"
          title="完成当前绘制"
        >
          完成
        </el-button>

        <el-button
          @click="handleExport"
          type="warning"
          :disabled="!hasExportableData"
          :loading="exporting"
          title="导出选中点位数据"
        >
          <el-icon><Download /></el-icon>
          导出
        </el-button>

        <el-button @click="showSettings" type="info">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>

        <el-button @click="showKmlSettings" type="success">
          <el-icon><Tools /></el-icon>
          KML设置
        </el-button>

        <el-button @click="showPointSettings" type="primary">
          <el-icon><Location /></el-icon>
          点位图标
        </el-button>
      </el-button-group>
    </div>
    
  <!-- 状态栏（已移除：显示信息由其他组件或页面顶部状态替代） -->
    
    <!-- KML数据导出对话框 -->
    <KMLDataExporter />
    
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Setting, 
  View, Hide, Tools, Location,
  Compass, Crop, Delete, Download
} from '@element-plus/icons-vue'
import { useAreaSelector } from '@/composables/use-area-selector.js'
import { useKMLExport } from '@/composables/use-kml-export.js'
import { useKMLBaseMapStore } from '@/store/kml-basemap.js'
import KMLDataExporter from './kml-basemap/KMLDataExporter.vue'

const props = defineProps({
  panoramaListVisible: {
    type: Boolean,
    default: true
  },
  kmlLayersVisible: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  totalCount: {
    type: Number,
    default: 0
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  mapInstance: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'toggle-panorama-list',
  'toggle-kml-layers',
  'show-settings',
  'show-kml-settings',
  'show-point-settings'
])

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

const handleFinishDrawing = async () => {
  await finishDrawing()
}

// 处理导出
const handleExport = () => {
  openExportDialog()
}

const togglePanoramaList = () => {
  emit('toggle-panorama-list')
}

const toggleKmlLayers = () => {
  emit('toggle-kml-layers')
}

const showSettings = () => {
  emit('show-settings')
}

const showKmlSettings = () => {
  emit('show-kml-settings')
}

const showPointSettings = () => {
  emit('show-point-settings')
}
</script>

<style lang="scss" scoped>
.map-controls {
  .toolbar {
    position: absolute;
    top: 20px;
  /* 进一步向左移动以避免遮挡，调整为更大的 right 值 */
  right: 170px;
    z-index: 1000;

    display: flex;
  gap: 6px;
  /* 再次缩小内边距，使白色区域更紧凑 */
  padding: 4px 4px;
  background: transparent; /* 修改为完全透明 */
  border-radius: 4px;
  box-shadow: none; /* 移除阴影 */
    backdrop-filter: none; /* 移除模糊效果 */
    
    /* 为工具栏中的所有按钮添加圆角 */
    .el-button {
      border-radius: 8px !important; /* 添加圆角 */
      transition: all 0.3s ease; /* 平滑过渡效果 */
      
      &:hover {
        transform: translateY(-1px); /* 悬停时轻微上移效果 */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); /* 悬停阴影 */
      }
      
      &:active {
        transform: translateY(0); /* 点击时恢复位置 */
      }
    }
  }

  /* 状态栏样式已移除 */
  
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
}

// 移动端适配
@media (max-width: 768px) {
  .map-controls {
    .toolbar {
  top: 10px;
  /* 移动端适当左移，但保持可触达 */
  right: 40px;
      
      .el-button-group {
        flex-direction: column;
        
        .el-button {
          margin: 0 0 4px 0;
        }
      }
    }
  }
}
</style>