<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="80%"
    :close-on-click-modal="false"
    class="kml-style-dialog"
  >
    <div class="kml-style-container">
      <!-- 左侧：KML文件列表 -->
      <div class="kml-file-list">
        <div class="list-header">
          <h3>{{ listTitle }}</h3>
          <el-tag v-if="props.basemapMode" type="warning" size="small">
            底图模式
          </el-tag>
          <el-tag v-else type="info" size="small">
            普通模式
          </el-tag>
        </div>
        
        <el-scrollbar height="500px">
          <div v-if="filteredKmlFiles.length === 0" class="empty-state">
            <el-empty 
              :description="props.basemapMode ? '暂无底图KML文件' : '暂无普通KML文件'" 
              :image-size="80"
            />
          </div>
          <div 
            v-for="kmlFile in filteredKmlFiles"
            :key="kmlFile.id"
            class="kml-file-item"
            :class="{ active: selectedKmlFile?.id === kmlFile.id }"
            @click="selectKmlFile(kmlFile)"
          >
            <div class="file-info">
              <span class="file-name">{{ kmlFile.title }}</span>
              <span class="point-count">{{ kmlFile.point_count || 0 }} 个点位</span>
              <el-tag 
                v-if="kmlFile.is_basemap" 
                type="warning" 
                size="small" 
                class="file-type-tag"
              >
                底图
              </el-tag>
            </div>
            <div class="file-preview">
              <StylePreview :style-config="kmlFile.styleConfig" />
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 右侧：样式编辑器 -->
      <div class="style-editor-panel">
        <el-tabs v-model="activeTab" v-if="selectedKmlFile">
          <el-tab-pane label="点样式" name="point">
            <PointStyleEditor 
              v-model="currentStyles.point"
              @change="handleStyleChange"
            />
          </el-tab-pane>
          
          <el-tab-pane label="线样式" name="line">
            <LineStyleEditor 
              v-model="currentStyles.line"
              @change="handleStyleChange"
            />
          </el-tab-pane>
          
          <el-tab-pane label="面样式" name="polygon">
            <PolygonStyleEditor 
              v-model="currentStyles.polygon"
              @change="handleStyleChange"
            />
          </el-tab-pane>
          
        </el-tabs>
        
        <div v-else class="no-selection">
          <el-empty description="请选择要配置的KML文件" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button @click="handleReset" type="warning">重置为默认</el-button>
        <el-button @click="handleSave" type="primary" :loading="saving">
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { kmlApi } from '@/api/kml.js'
import PointStyleEditor from './styles/PointStyleEditor.vue'
import LineStyleEditor from './styles/LineStyleEditor.vue'
import PolygonStyleEditor from './styles/PolygonStyleEditor.vue'
import StylePreview from './styles/StylePreview.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  basemapMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'styles-updated'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const kmlFiles = ref([])
const selectedKmlFile = ref(null)
const activeTab = ref('point')
const saving = ref(false)

// 当前样式配置
const currentStyles = reactive({
  point: {},
  line: {},
  polygon: {}
})

// 原始样式配置（用于取消时恢复）
const originalStyles = ref({})

// 计算属性
const dialogTitle = computed(() => {
  return props.basemapMode ? '底图KML样式配置' : 'KML样式配置'
})

const listTitle = computed(() => {
  return props.basemapMode ? '底图KML文件列表' : 'KML文件列表'
})

const filteredKmlFiles = computed(() => {
  return kmlFiles.value.filter(file => {
    // basemapMode为true时只显示底图文件(is_basemap=1)
    // basemapMode为false时只显示普通文件(is_basemap=0或null)
    return props.basemapMode ? file.is_basemap : !file.is_basemap
  })
})

// 监听对话框显示状态
watch(visible, async (newVisible) => {
  if (newVisible) {
    await loadKmlFiles()
  }
})

// 监听底图模式变化，清空选中的文件
watch(() => props.basemapMode, () => {
  selectedKmlFile.value = null
})

// 加载KML文件列表
const loadKmlFiles = async () => {
  try {
    // 使用与地图页面相同的API，确保考虑文件夹可见性
    const response = await kmlApi.getKmlFiles({ 
      includeHidden: false,
      respectFolderVisibility: true,
      // basemapMode: 需要所有；否则仅普通
      includeBasemap: props.basemapMode ? true : false,
      basemapOnly: props.basemapMode ? true : false,
      _t: new Date().getTime()
    })
    kmlFiles.value = response.data || []
    
    // 为每个KML文件加载样式配置
    for (const kmlFile of kmlFiles.value) {
      try {
        const styleResponse = await kmlApi.getKmlFileStyles(kmlFile.id)
        kmlFile.styleConfig = styleResponse.data
      } catch (error) {
        kmlFile.styleConfig = getDefaultStyles()
      }
    }
  } catch (error) {
    ElMessage.error('加载KML文件列表失败')
  }
}


// 选择KML文件
const selectKmlFile = async (kmlFile) => {
  selectedKmlFile.value = kmlFile
  
  // 加载该文件的样式配置
  try {
    const response = await kmlApi.getKmlFileStyles(kmlFile.id)
    const styles = response.data
    
    // 分组样式配置
        currentStyles.point = {
      color: styles.point_color,
      size: Number(styles.point_size),
      opacity: parseFloat(styles.point_opacity),
      labelSize: Number(styles.point_label_size),
      labelColor: styles.point_label_color,
      // 聚合
      clusterEnabled: Boolean(styles.cluster_enabled),
      clusterColor: styles.cluster_color || styles.cluster_icon_color || styles.point_color
    }
    
    currentStyles.line = {
      color: styles.line_color,
      width: Number(styles.line_width),
      opacity: parseFloat(styles.line_opacity),
      style: styles.line_style
    }
    
    currentStyles.polygon = {
      fillColor: styles.polygon_fill_color,
      fillOpacity: parseFloat(styles.polygon_fill_opacity),
      strokeColor: styles.polygon_stroke_color,
      strokeWidth: Number(styles.polygon_stroke_width),
      strokeStyle: styles.polygon_stroke_style
    }
    
    
    // 保存原始配置
    originalStyles.value = JSON.parse(JSON.stringify(currentStyles))
    
  } catch (error) {
    ElMessage.error('加载样式配置失败')
  }
}

// 处理样式变化
const handleStyleChange = () => {
  // 实时预览功能可以在这里实现
  // 暂时只更新选中文件的样式配置用于预览
  if (selectedKmlFile.value) {
    selectedKmlFile.value.styleConfig = convertToApiFormat(currentStyles)
  }
}


// 保存配置
const handleSave = async () => {
  if (!selectedKmlFile.value) {
    ElMessage.warning('请选择要保存的KML文件')
    return
  }
  
  saving.value = true
  
  try {
    const styleConfig = convertToApiFormat(currentStyles)
    await kmlApi.updateKmlFileStyles(selectedKmlFile.value.id, styleConfig)
    
    ElMessage.success('样式配置保存成功')
    
    // 更新文件列表中的样式配置
    const fileIndex = kmlFiles.value.findIndex(f => f.id === selectedKmlFile.value.id)
    if (fileIndex !== -1) {
       kmlFiles.value[fileIndex].styleConfig = styleConfig
    }
    
    // 延迟触发事件，确保服务器配置已保存完成
    setTimeout(() => {
      emit('styles-updated')
    }, 300)
    
  } catch (error) {
    ElMessage.error('保存样式配置失败')
  } finally {
    saving.value = false
  }
}

// 重置为默认
const handleReset = async () => {
  if (!selectedKmlFile.value) {
    ElMessage.warning('请选择要重置的KML文件')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要重置为默认样式吗？', '确认重置', {
      type: 'warning'
    })
    
    await kmlApi.resetKmlFileStyles(selectedKmlFile.value.id)
    
    // 重新加载样式配置
    await selectKmlFile(selectedKmlFile.value)
    
    ElMessage.success('样式已重置为默认')
    emit('styles-updated')
    
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置样式失败')
    }
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
  
  // 恢复原始样式配置
  if (originalStyles.value && selectedKmlFile.value) {
    Object.assign(currentStyles, originalStyles.value)
  }
}

// 转换样式格式为API格式
const convertToApiFormat = (styles) => {
  return {
    point_color: styles.point.color,
    point_size: styles.point.size,
    point_opacity: styles.point.opacity,
    point_icon_type: 'marker', // 固定使用marker形状
    point_label_size: styles.point.labelSize,
    point_label_color: styles.point.labelColor,
    // 聚合
    cluster_enabled: Boolean(styles.point.clusterEnabled),
    cluster_color: styles.point.clusterColor || styles.point.color,
    
    line_color: styles.line.color,
    line_width: styles.line.width,
    line_opacity: styles.line.opacity,
    line_style: styles.line.style,
    
    polygon_fill_color: styles.polygon.fillColor,
    polygon_fill_opacity: styles.polygon.fillOpacity,
    polygon_stroke_color: styles.polygon.strokeColor,
    polygon_stroke_width: styles.polygon.strokeWidth,
    polygon_stroke_style: styles.polygon.strokeStyle
  }
}

// 获取默认样式
const getDefaultStyles = () => {
  return {
    point_color: '#ff7800',
    point_size: 8,
    point_opacity: 1.0,
    point_icon_type: 'marker',
    point_label_size: 0,
    point_label_color: '#000000',
    
    line_color: '#ff7800',
    line_width: 2,
    line_opacity: 0.8,
    line_style: 'solid',
    
    polygon_fill_color: '#ff7800',
    polygon_fill_opacity: 0.3,
    polygon_stroke_color: '#ff7800',
    polygon_stroke_width: 2,
    polygon_stroke_style: 'solid',
    
  }
}
</script>

<style lang="scss" scoped>
.kml-style-dialog {
  .kml-style-container {
    display: flex;
    height: 600px;
    gap: 20px;
  }
  
  .kml-file-list {
    width: 300px;
    border-right: 1px solid #e4e7ed;
    padding-right: 20px;
    
    .list-header {
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
    }
    
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
    }
    
    .kml-file-item {
      padding: 12px;
      border: 1px solid #e4e7ed;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        border-color: #409eff;
        background-color: #f0f9ff;
      }
      
      &.active {
        border-color: #409eff;
        background-color: #e6f7ff;
      }
      
      .file-info {
        .file-name {
          display: block;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .point-count {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .file-type-tag {
          margin-left: 8px;
        }
      }
      
      .file-preview {
        margin-top: 8px;
        height: 20px;
      }
    }
  }
  
  .style-editor-panel {
    flex: 1;
    
    .no-selection {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>
