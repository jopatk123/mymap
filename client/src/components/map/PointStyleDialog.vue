<template>
  <el-dialog
    v-model="visible"
    title="点位图标设置"
    width="80%"
    :close-on-click-modal="false"
    class="point-style-dialog"
    top="5vh"
  >
    <div class="point-style-container">
      <!-- 左侧：点位类型选择 -->
      <div class="point-type-list">
        <div class="list-header">
          <h3>点位类型</h3>
        </div>
        
        <div class="point-type-items">
          <div 
            class="point-type-item"
            :class="{ active: selectedPointType === 'video' }"
            @click="selectPointType('video')"
          >
            <div class="type-icon video-icon">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="type-info">
              <span class="type-name">视频点位</span>
              <span class="type-desc">设置视频点位的图标和标签样式</span>
            </div>
            <div class="type-preview">
              <StylePreview :style-config="videoStyles" :show-full-preview="false" />
            </div>
          </div>
          
          <div 
            class="point-type-item"
            :class="{ active: selectedPointType === 'panorama' }"
            @click="selectPointType('panorama')"
          >
            <div class="type-icon panorama-icon">
              <el-icon><Camera /></el-icon>
            </div>
            <div class="type-info">
              <span class="type-name">全景图点位</span>
              <span class="type-desc">设置全景图点位的图标和标签样式</span>
            </div>
            <div class="type-preview">
              <StylePreview :style-config="panoramaStyles" :show-full-preview="false" />
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：样式编辑器 -->
      <div class="style-editor-panel">
        <div v-if="selectedPointType" class="editor-content">
          <div class="editor-header">
            <h4>{{ selectedPointType === 'video' ? '视频点位' : '全景图点位' }}样式设置</h4>
          </div>
          
          <PointStyleEditor 
            v-model="currentStyles"
            @change="handleStyleChange"
          />
        </div>
        
        <div v-else class="no-selection">
          <el-empty description="请选择要配置的点位类型" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button @click="handleReset" type="warning" :disabled="!selectedPointType">
          重置为默认
        </el-button>
        <el-button @click="handleSave" type="primary" :loading="saving" :disabled="!selectedPointType">
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoPlay, Camera } from '@element-plus/icons-vue'
import { videoPointStyleApi, panoramaPointStyleApi } from '@/api/pointStyle.js'
import PointStyleEditor from './styles/PointStyleEditor.vue'
import StylePreview from './styles/StylePreview.vue'

const props = defineProps({
  modelValue: {
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

const selectedPointType = ref('')
const saving = ref(false)

// 样式配置
const videoStyles = ref({})
const panoramaStyles = ref({})
const currentStyles = reactive({})
const originalStyles = ref({})

// 监听对话框显示状态
watch(visible, async (newVisible) => {
  if (newVisible) {
    await loadAllStyles()
    // 默认选择视频点位
    if (!selectedPointType.value) {
      selectPointType('video')
    }
  }
})

// 加载所有样式配置
const loadAllStyles = async () => {
  try {
    const [videoResponse, panoramaResponse] = await Promise.all([
      videoPointStyleApi.getStyles(),
      panoramaPointStyleApi.getStyles()
    ])
    
    videoStyles.value = convertFromApiFormat(videoResponse.data)
    panoramaStyles.value = convertFromApiFormat(panoramaResponse.data)
    
  } catch (error) {
    console.error('加载点位样式配置失败:', error)
    ElMessage.error('加载样式配置失败')
  }
}

// 选择点位类型
const selectPointType = (type) => {
  selectedPointType.value = type
  
  // 根据类型设置当前样式
  const styles = type === 'video' ? videoStyles.value : panoramaStyles.value
  Object.assign(currentStyles, styles)
  
  // 保存原始配置
  originalStyles.value = JSON.parse(JSON.stringify(currentStyles))
}

// 处理样式变化
const handleStyleChange = () => {
  // 实时更新预览
  if (selectedPointType.value === 'video') {
    videoStyles.value = { ...currentStyles }
  } else if (selectedPointType.value === 'panorama') {
    panoramaStyles.value = { ...currentStyles }
  }
}

// 保存配置
const handleSave = async () => {
  if (!selectedPointType.value) {
    ElMessage.warning('请选择要保存的点位类型')
    return
  }
  
  saving.value = true
  
  try {
    const apiConfig = convertToApiFormat(currentStyles)
    
    if (selectedPointType.value === 'video') {
      await videoPointStyleApi.updateStyles(apiConfig)
      videoStyles.value = { ...currentStyles }
    } else {
      await panoramaPointStyleApi.updateStyles(apiConfig)
      panoramaStyles.value = { ...currentStyles }
    }
    
    ElMessage.success('点位样式配置保存成功')
    emit('styles-updated')
    
  } catch (error) {
    console.error('保存点位样式配置失败:', error)
    ElMessage.error('保存样式配置失败')
  } finally {
    saving.value = false
  }
}

// 重置为默认
const handleReset = async () => {
  if (!selectedPointType.value) {
    ElMessage.warning('请选择要重置的点位类型')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要重置为默认样式吗？', '确认重置', {
      type: 'warning'
    })
    
    if (selectedPointType.value === 'video') {
      const response = await videoPointStyleApi.resetStyles()
      videoStyles.value = convertFromApiFormat(response.data)
    } else {
      const response = await panoramaPointStyleApi.resetStyles()
      panoramaStyles.value = convertFromApiFormat(response.data)
    }
    
    // 重新选择当前类型以更新编辑器
    selectPointType(selectedPointType.value)
    
    ElMessage.success('样式已重置为默认')
    emit('styles-updated')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置样式失败:', error)
      ElMessage.error('重置样式失败')
    }
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
  
  // 恢复原始样式配置
  if (originalStyles.value && selectedPointType.value) {
    Object.assign(currentStyles, originalStyles.value)
    
    // 恢复预览样式
    if (selectedPointType.value === 'video') {
      videoStyles.value = { ...originalStyles.value }
    } else if (selectedPointType.value === 'panorama') {
      panoramaStyles.value = { ...originalStyles.value }
    }
  }
}

// 转换API格式到组件格式
const convertFromApiFormat = (apiData) => {
  return {
    color: apiData.point_color,
    size: Number(apiData.point_size),
    opacity: parseFloat(apiData.point_opacity),
    iconType: apiData.point_icon_type,
    labelSize: Number(apiData.point_label_size),
    labelColor: apiData.point_label_color
  }
}

// 转换组件格式到API格式
const convertToApiFormat = (componentData) => {
  return {
    point_color: componentData.color,
    point_size: componentData.size,
    point_opacity: componentData.opacity,
    point_icon_type: componentData.iconType,
    point_label_size: componentData.labelSize,
    point_label_color: componentData.labelColor
  }
}
</script>

<style lang="scss" scoped>
.point-style-dialog {
  .point-style-container {
    display: flex;
    height: 450px;
    gap: 20px;
  }
  
  .point-type-list {
    width: 320px;
    border-right: 1px solid #e4e7ed;
    padding-right: 20px;
    
    .list-header {
      margin-bottom: 16px;
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }
    }
    
    .point-type-items {
      .point-type-item {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
        gap: 12px;
        
        &:hover {
          border-color: #409eff;
          background-color: #f0f9ff;
        }
        
        &.active {
          border-color: #409eff;
          background-color: #e6f7ff;
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
        }
        
        .type-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          
          &.video-icon {
            background-color: #ff4757;
            color: white;
          }
          
          &.panorama-icon {
            background-color: #2ed573;
            color: white;
          }
        }
        
        .type-info {
          flex: 1;
          
          .type-name {
            display: block;
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 4px;
            color: #303133;
          }
          
          .type-desc {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
          }
        }
        
        .type-preview {
          width: 60px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }
  }
  
  .style-editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .editor-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      
      .editor-header {
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e4e7ed;
        flex-shrink: 0;
        
        h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #303133;
        }
      }
      
      // 确保PointStyleEditor可以滚动
      :deep(.point-style-editor) {
        flex: 1;
        overflow-y: auto;
        padding-right: 8px;
      }
    }
    
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
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>