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
            @update:modelValue="handleStyleUpdate"
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
        <el-button @click="testStyleChange" type="info" :disabled="!selectedPointType">
          测试样式修改
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
import { notifyPointStyleUpdate, notifyMarkersRefresh } from '@/utils/style-events.js'

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
    console.log('🔓 对话框打开，开始初始化...')
    await loadAllStyles()
    
    // 重置选择状态
    selectedPointType.value = ''
    
    // 默认选择视频点位
    setTimeout(() => {
      selectPointType('video')
    }, 100)
  } else {
    console.log('🔒 对话框关闭')
    // 清理状态
    selectedPointType.value = ''
    Object.keys(currentStyles).forEach(key => delete currentStyles[key])
  }
})

// 加载所有样式配置
const loadAllStyles = async () => {
  try {
    console.log('📥 开始加载所有样式配置...')
    
    const [videoResponse, panoramaResponse] = await Promise.all([
      videoPointStyleApi.getStyles(),
      panoramaPointStyleApi.getStyles()
    ])
    
    console.log('📥 服务器返回的样式数据:', {
      video: videoResponse.data,
      panorama: panoramaResponse.data
    })
    
    videoStyles.value = convertFromApiFormat(videoResponse.data)
    panoramaStyles.value = convertFromApiFormat(panoramaResponse.data)
    
    console.log('✅ 样式配置加载完成:', {
      video: videoStyles.value,
      panorama: panoramaStyles.value
    })
    
  } catch (error) {
    console.error('❌ 加载点位样式配置失败:', error)
    ElMessage.error('加载样式配置失败')
  }
}

// 选择点位类型
const selectPointType = (type) => {
  console.log(`🎯 选择点位类型: ${type}`)
  selectedPointType.value = type
  
  // 根据类型设置当前样式
  const styles = type === 'video' ? videoStyles.value : panoramaStyles.value
  console.log(`📋 设置${type}样式:`, styles)
  
  // 清空当前样式对象，然后重新赋值
  Object.keys(currentStyles).forEach(key => delete currentStyles[key])
  Object.assign(currentStyles, styles)
  
  console.log(`✅ 当前样式已更新:`, currentStyles)
  
  // 保存原始配置
  originalStyles.value = JSON.parse(JSON.stringify(currentStyles))
}

// 处理样式更新（v-model）
const handleStyleUpdate = (newStyles) => {
  console.log('📝 收到样式更新事件:', {
    当前类型: selectedPointType.value,
    新样式: newStyles,
    当前currentStyles: currentStyles
  })
  
  if (newStyles) {
    // 清空并重新赋值currentStyles
    Object.keys(currentStyles).forEach(key => delete currentStyles[key])
    Object.assign(currentStyles, newStyles)
    console.log('✅ currentStyles已通过v-model更新为:', currentStyles)
  }
}

// 处理样式变化
const handleStyleChange = (newStyles) => {
  console.log('🎨 样式发生变化:', {
    当前类型: selectedPointType.value,
    接收到的新样式: newStyles,
    当前样式: currentStyles
  })
  
  // 实时更新预览
  if (selectedPointType.value === 'video') {
    videoStyles.value = { ...currentStyles }
    console.log('🔄 更新视频样式预览:', videoStyles.value)
  } else if (selectedPointType.value === 'panorama') {
    panoramaStyles.value = { ...currentStyles }
    console.log('🔄 更新全景图样式预览:', panoramaStyles.value)
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
    console.log(`🔍 准备保存${selectedPointType.value}点位样式:`)
    console.log('   当前选择的类型:', selectedPointType.value)
    console.log('   currentStyles对象:', currentStyles)
    console.log('   currentStyles的所有属性:', Object.keys(currentStyles))
    console.log('   currentStyles的值:', Object.values(currentStyles))
    
    // 检查currentStyles是否为空或无效
    if (!currentStyles || Object.keys(currentStyles).length === 0) {
      console.error('❌ currentStyles为空，无法保存')
      ElMessage.error('样式数据为空，请重新设置')
      return
    }
    
    const apiConfig = convertToApiFormat(currentStyles)
    
    console.log(`🔄 保存${selectedPointType.value}点位样式:`, {
      组件格式: currentStyles,
      API格式: apiConfig,
      转换前检查: {
        color: currentStyles.color,
        size: currentStyles.size,
        opacity: currentStyles.opacity,
        labelSize: currentStyles.labelSize,
        labelColor: currentStyles.labelColor
      }
    })
    
    if (selectedPointType.value === 'video') {
      const response = await videoPointStyleApi.updateStyles(apiConfig)
      videoStyles.value = { ...currentStyles }
      window.videoPointStyles = response.data // 使用服务器返回的数据
      console.log('✅ 视频点位样式已保存并同步到全局变量:', window.videoPointStyles)
      
      // 更新本地缓存
      updateLocalCache('video', response.data)
      
      // 通知样式更新
      notifyPointStyleUpdate('video', response.data)
    } else {
      const response = await panoramaPointStyleApi.updateStyles(apiConfig)
      panoramaStyles.value = { ...currentStyles }
      window.panoramaPointStyles = response.data // 使用服务器返回的数据
      console.log('✅ 全景图点位样式已保存并同步到全局变量:', window.panoramaPointStyles)
      
      // 更新本地缓存
      updateLocalCache('panorama', response.data)
      
      // 通知样式更新
      notifyPointStyleUpdate('panorama', response.data)
    }
    
    // 通知地图刷新标记
    notifyMarkersRefresh('style-update')
    
    ElMessage.success('点位样式配置保存成功')
    
    // 触发样式更新事件
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
      window.videoPointStyles = response.data // 更新全局变量
      // 更新本地缓存
      updateLocalCache('video', response.data)
    } else {
      const response = await panoramaPointStyleApi.resetStyles()
      panoramaStyles.value = convertFromApiFormat(response.data)
      window.panoramaPointStyles = response.data // 更新全局变量
      // 更新本地缓存
      updateLocalCache('panorama', response.data)
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

// 测试样式修改
const testStyleChange = () => {
  if (!selectedPointType.value) return
  
  console.log('🧪 开始测试样式修改...')
  console.log('   修改前的currentStyles:', currentStyles)
  
  // 强制修改样式
  const testColor = '#' + Math.floor(Math.random()*16777215).toString(16)
  const testSize = Math.floor(Math.random() * 20) + 8
  
  currentStyles.color = testColor
  currentStyles.size = testSize
  currentStyles.opacity = 0.8
  currentStyles.labelSize = 16
  currentStyles.labelColor = '#ff0000'
  
  console.log('   修改后的currentStyles:', currentStyles)
  console.log('   测试修改完成，请点击保存按钮')
  
  // 触发样式变化事件
  handleStyleChange()
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
  const converted = {
    color: apiData.point_color,
    size: Number(apiData.point_size),
    opacity: parseFloat(apiData.point_opacity),
    labelSize: Number(apiData.point_label_size),
    labelColor: apiData.point_label_color
  }
  console.log('🔄 API格式转组件格式:', { 输入: apiData, 输出: converted })
  return converted
}

// 转换组件格式到API格式
const convertToApiFormat = (componentData) => {
  const converted = {
    point_color: componentData.color,
    point_size: componentData.size,
    point_opacity: componentData.opacity,
    point_icon_type: 'marker', // 固定使用marker形状
    point_label_size: componentData.labelSize,
    point_label_color: componentData.labelColor
  }
  console.log('🔄 组件格式转API格式:', { 输入: componentData, 输出: converted })
  return converted
}

// 更新本地缓存
const updateLocalCache = (type, newStyles) => {
  try {
    const cached = localStorage.getItem('pointStyles')
    let styles = {}
    
    if (cached) {
      styles = JSON.parse(cached)
    }
    
    // 更新指定类型的样式
    styles[type] = newStyles
    styles.lastUpdated = Date.now()
    
    localStorage.setItem('pointStyles', JSON.stringify(styles))
    console.log(`🔄 已更新${type}样式的本地缓存:`, newStyles)
  } catch (error) {
    console.warn('更新本地样式缓存失败:', error)
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
