<template>
  <el-dialog
    v-model="visible"
    title="初始显示设置"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleDialogClosed"
  >
    <div class="initial-view-settings">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        class="settings-form"
      >
        <!-- 启用状态 -->
        <el-form-item label="启用设置" prop="enabled">
          <el-switch
            v-model="form.enabled"
            active-text="启用"
            inactive-text="禁用"
            @change="handleEnabledChange"
          />
          <div class="help-text">
            启用后，地图将使用下面设置的位置和缩放级别作为初始显示
          </div>
        </el-form-item>

        <div v-if="form.enabled" class="enabled-settings">
          <!-- 经度设置 -->
          <el-form-item label="经度" prop="center.0">
            <el-input-number
              v-model="form.center[0]"
              :precision="6"
              :step="0.000001"
              :min="-180"
              :max="180"
              controls-position="right"
              placeholder="请输入WGS84经度"
              style="width: 200px"
            />
            <span class="coordinate-unit">°E</span>
            <el-button 
              @click="getCurrentLocation" 
              type="primary" 
              link
              :loading="gettingLocation"
              style="margin-left: 10px"
            >
              <el-icon><Location /></el-icon>
              获取当前位置
            </el-button>
          </el-form-item>

          <!-- 纬度设置 -->
          <el-form-item label="纬度" prop="center.1">
            <el-input-number
              v-model="form.center[1]"
              :precision="6"
              :step="0.000001"
              :min="-90"
              :max="90"
              controls-position="right"
              placeholder="请输入WGS84纬度"
              style="width: 200px"
            />
            <span class="coordinate-unit">°N</span>
          </el-form-item>

          <!-- 缩放级别 -->
          <el-form-item label="缩放级别" prop="zoom">
            <el-slider
              v-model="form.zoom"
              :min="1"
              :max="18"
              :step="1"
              show-input
              style="width: 300px"
            />
            <div class="help-text">
              1: 世界级别 ~ 18: 街道级别
            </div>
          </el-form-item>

          <!-- 预设位置 -->
          <el-form-item label="常用位置">
            <el-select
              v-model="selectedPreset"
              placeholder="选择预设位置"
              @change="applyPreset"
              style="width: 200px"
            >
              <el-option
                v-for="preset in presets"
                :key="preset.name"
                :label="preset.name"
                :value="preset.name"
              />
            </el-select>
            <div class="help-text">
              选择常用城市位置快速设置
            </div>
          </el-form-item>
        </div>
      </el-form>

      <!-- 预览地图 -->
      <div v-if="form.enabled" class="preview-section">
        <h4>预览</h4>
        <div class="preview-map" ref="previewMapRef">
          <div class="preview-placeholder">
            <el-icon><MapLocation /></el-icon>
            <p>经度: {{ form.center[0].toFixed(6) }}°</p>
            <p>纬度: {{ form.center[1].toFixed(6) }}°</p>
            <p>缩放级别: {{ form.zoom }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button @click="handleReset" type="warning">重置为默认</el-button>
        <el-button 
          @click="handleSave" 
          type="primary"
          :loading="saving"
        >
          保存设置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location, MapLocation } from '@element-plus/icons-vue'
import { initialViewApi } from '../../api/initial-view.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'settings-updated'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref()
const previewMapRef = ref()
const saving = ref(false)
const gettingLocation = ref(false)
const selectedPreset = ref('')

// 表单数据
const form = reactive({
  enabled: false,
  center: [116.4074, 39.9042], // 默认北京
  zoom: 12
})

// 预设位置
const presets = [
  { name: '北京', center: [116.4074, 39.9042], zoom: 12 },
  { name: '上海', center: [121.4737, 31.2304], zoom: 12 },
  { name: '广州', center: [113.2644, 23.1291], zoom: 12 },
  { name: '深圳', center: [114.0579, 22.5431], zoom: 12 },
  { name: '杭州', center: [120.1614, 30.2941], zoom: 12 },
  { name: '南京', center: [118.7969, 32.0603], zoom: 12 },
  { name: '武汉', center: [114.3055, 30.5928], zoom: 12 },
  { name: '成都', center: [104.0665, 30.5723], zoom: 12 },
  { name: '西安', center: [108.9398, 34.3412], zoom: 12 },
  { name: '重庆', center: [106.5044, 29.5332], zoom: 12 }
]

// 表单验证规则
const rules = {
  'center.0': [
    { required: true, message: '请输入经度', trigger: 'blur' },
    { type: 'number', min: -180, max: 180, message: '经度范围: -180° ~ 180°', trigger: 'blur' }
  ],
  'center.1': [
    { required: true, message: '请输入纬度', trigger: 'blur' },
    { type: 'number', min: -90, max: 90, message: '纬度范围: -90° ~ 90°', trigger: 'blur' }
  ],
  zoom: [
    { required: true, message: '请选择缩放级别', trigger: 'blur' },
    { type: 'number', min: 1, max: 18, message: '缩放级别范围: 1 ~ 18', trigger: 'blur' }
  ]
}

// 监听对话框显示状态，加载设置
watch(visible, async (isVisible) => {
  if (isVisible) {
    await loadSettings()
  }
})

// 加载设置
const loadSettings = async () => {
  try {
    const settings = await initialViewApi.getSettings()
    form.enabled = settings.enabled
    form.center = [...settings.center]
    form.zoom = settings.zoom
  } catch (error) {
    console.error('加载初始显示设置失败:', error)
    ElMessage.error('加载设置失败')
  }
}

// 获取当前位置
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持地理位置获取')
    return
  }

  gettingLocation.value = true
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.center[0] = Number(position.coords.longitude.toFixed(6))
      form.center[1] = Number(position.coords.latitude.toFixed(6))
      ElMessage.success('位置获取成功')
      gettingLocation.value = false
    },
    (error) => {
      console.error('获取位置失败:', error)
      ElMessage.error('获取位置失败，请检查浏览器权限设置')
      gettingLocation.value = false
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  )
}

// 应用预设位置
const applyPreset = (presetName) => {
  const preset = presets.find(p => p.name === presetName)
  if (preset) {
    form.center = [...preset.center]
    form.zoom = preset.zoom
    ElMessage.success(`已应用${presetName}的位置设置`)
  }
}

// 启用状态变化处理
const handleEnabledChange = (enabled) => {
  if (!enabled) {
    selectedPreset.value = ''
  }
}

// 保存设置
const handleSave = async () => {
  try {
    // 表单验证
    if (form.enabled) {
      await formRef.value.validate()
    }

    saving.value = true

    const settings = {
      enabled: form.enabled,
      center: form.enabled ? form.center : [116.4074, 39.9042],
      zoom: form.enabled ? form.zoom : 12
    }

    const response = await initialViewApi.updateSettings(settings)
    
    // 保存成功（axios拦截器已处理错误情况）
    ElMessage.success('初始显示设置保存成功')
    emit('settings-updated')
    visible.value = false
  } catch (error) {
    console.error('保存初始显示设置失败:', error)
    ElMessage.error(error.message || '保存设置失败')
  } finally {
    saving.value = false
  }
}

// 重置为默认
const handleReset = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置为默认设置吗？这将清除当前的所有配置。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    saving.value = true
    const response = await initialViewApi.resetSettings()
    
    // 重置成功（axios拦截器已处理错误情况）
    await loadSettings()
    selectedPreset.value = ''
    ElMessage.success('已重置为默认设置')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置初始显示设置失败:', error)
      ElMessage.error(error.message || '重置设置失败')
    }
  } finally {
    saving.value = false
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
}

// 对话框关闭处理
const handleDialogClosed = () => {
  selectedPreset.value = ''
  // 重置表单验证状态
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  })
}
</script>

<style lang="scss" scoped>
.initial-view-settings {
  .settings-form {
    margin-bottom: 20px;
  }

  .enabled-settings {
    margin-left: 20px;
    padding-left: 20px;
    border-left: 3px solid #409eff;
  }

  .help-text {
    margin-top: 5px;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }

  .coordinate-unit {
    margin-left: 8px;
    color: #606266;
    font-size: 14px;
  }

  .preview-section {
    margin-top: 30px;
    
    h4 {
      margin: 0 0 15px 0;
      color: #303133;
    }
    
    .preview-map {
      height: 200px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #f5f7fa;
      
      .preview-placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #909399;
        
        .el-icon {
          font-size: 40px;
          margin-bottom: 10px;
        }
        
        p {
          margin: 2px 0;
          font-size: 14px;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-slider) {
  margin-right: 20px;
}
</style>