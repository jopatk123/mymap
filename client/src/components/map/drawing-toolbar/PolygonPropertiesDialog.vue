<!-- 面积属性编辑对话框 -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑面积属性"
    width="500px"
    :before-close="handleClose"
    append-to-body
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
      label-position="left"
    >
      <el-form-item label="名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入面积名称"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="请输入面积描述"
          :rows="3"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="边框颜色">
        <el-color-picker 
          v-model="formData.color" 
          :predefine="colorPresets"
          show-alpha
        />
      </el-form-item>
      
      <el-form-item label="填充颜色">
        <el-color-picker 
          v-model="formData.fillColor" 
          :predefine="colorPresets"
          show-alpha
        />
      </el-form-item>
      
      <el-form-item label="边框粗细">
        <el-slider
          v-model="formData.weight"
          :min="1"
          :max="10"
          :step="1"
          show-input
          :show-input-controls="false"
          input-size="small"
        />
      </el-form-item>
      
      <el-form-item label="边框透明度">
        <el-slider
          v-model="formData.opacity"
          :min="0.1"
          :max="1"
          :step="0.1"
          :format-tooltip="formatOpacityTooltip"
          show-input
          :show-input-controls="false"
          input-size="small"
        />
      </el-form-item>
      
      <el-form-item label="填充透明度">
        <el-slider
          v-model="formData.fillOpacity"
          :min="0"
          :max="1"
          :step="0.1"
          :format-tooltip="formatOpacityTooltip"
          show-input
          :show-input-controls="false"
          input-size="small"
        />
      </el-form-item>
      
      <el-form-item label="线型">
        <el-select v-model="formData.dashArray" placeholder="选择线型">
          <el-option
            v-for="dash in dashOptions"
            :key="dash.value"
            :label="dash.label"
            :value="dash.value"
          >
            <div class="dash-option">
              <div 
                class="dash-preview" 
                :style="{ 
                  borderTop: `2px ${dash.value ? 'dashed' : 'solid'} #606266`,
                  borderTopColor: formData.color || '#3388ff'
                }"
              ></div>
              <span>{{ dash.label }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="统计信息">
        <div class="stats-display">
          <el-descriptions :column="2" size="small">
            <el-descriptions-item label="面积">
              {{ formatArea(formData.area) }}
            </el-descriptions-item>
            <el-descriptions-item label="周长">
              {{ formatDistance(formData.perimeter) }}
            </el-descriptions-item>
            <el-descriptions-item label="点数" span="2">
              {{ formData.latlngs?.length || 0 }} 个点
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  polygon: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const dialogVisible = ref(false)
const formRef = ref(null)

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  color: '#3388ff',
  fillColor: '#3388ff',
  weight: 3,
  opacity: 1.0,
  fillOpacity: 0.2,
  dashArray: null,
  area: 0,
  perimeter: 0,
  latlngs: []
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入面积名称', trigger: 'blur' }
  ]
}

// 颜色预设
const colorPresets = [
  '#3388ff',
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#f39c12',
  '#e74c3c',
  '#2ecc71',
  '#9b59b6',
  '#34495e',
  '#95a5a6'
]

// 线型选项
const dashOptions = [
  { value: null, label: '实线' },
  { value: '5, 5', label: '短划线' },
  { value: '10, 10', label: '长划线' },
  { value: '5, 5, 1, 5', label: '点划线' },
  { value: '10, 5, 1, 5', label: '长点划线' }
]

// 监听对话框显示状态
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    const g = props.polygon || {}
    // 初始化表单数据，添加默认名称
    const defaultName = g.name && String(g.name).trim() ? g.name : `多边形${Date.now().toString().slice(-6)}`
    Object.assign(formData, {
      name: defaultName,
      description: g.description || '',
      color: g.color || '#3388ff',
      fillColor: g.fillColor || '#3388ff',
      weight: g.weight || 3,
      opacity: g.opacity || 1.0,
      fillOpacity: g.fillOpacity || 0.2,
      dashArray: g.dashArray || null,
      area: g.area || 0,
      perimeter: g.perimeter || 0,
      latlngs: g.latlngs || []
    })
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 格式化透明度提示
const formatOpacityTooltip = (val) => {
  return `${Math.round(val * 100)}%`
}

// 格式化面积显示
const formatArea = (area) => {
  if (!area) return '0 平方米'
  if (area < 1000000) {
    return `${area.toFixed(2)} 平方米`
  } else {
    return `${(area / 1000000).toFixed(2)} 平方公里`
  }
}

// 格式化距离显示
const formatDistance = (distance) => {
  if (!distance) return '0 米'
  if (distance < 1000) {
    return `${distance.toFixed(2)} 米`
  } else {
    return `${(distance / 1000).toFixed(2)} 公里`
  }
}

// 处理关闭
const handleClose = () => {
  dialogVisible.value = false
}

// 处理保存
const handleSave = async () => {
  try {
    await formRef.value?.validate()
    emit('save', { ...formData })
    handleClose()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.dash-option {
  display: flex;
  align-items: center;
  
  .dash-preview {
    width: 40px;
    height: 1px;
    margin-right: 8px;
  }
}

.stats-display {
  width: 100%;
  
  :deep(.el-descriptions__body) {
    background: var(--el-fill-color-light);
    border-radius: 4px;
    padding: 12px;
  }
}

.dialog-footer {
  text-align: right;
}
</style>