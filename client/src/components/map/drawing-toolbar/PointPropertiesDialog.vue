<!-- 点位属性编辑对话框 -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑点位属性"
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
          placeholder="请输入点位名称"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="请输入点位描述"
          :rows="3"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="图标">
        <div class="icon-selector">
          <div class="current-icon">
            <span class="icon-display">{{ formData.icon }}</span>
            <span class="icon-name">{{ getIconName(formData.icon) }}</span>
          </div>
          <div class="icon-options">
            <div 
              v-for="icon in iconOptions"
              :key="icon.value"
              class="icon-option"
              :class="{ active: formData.icon === icon.value }"
              @click="formData.icon = icon.value"
            >
              <span class="icon">{{ icon.value }}</span>
              <span class="name">{{ icon.name }}</span>
            </div>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="颜色">
        <el-color-picker 
          v-model="formData.color" 
          :predefine="colorPresets"
          show-alpha
        />
      </el-form-item>
      
      <el-form-item label="大小">
        <el-slider
          v-model="formData.size"
          :min="16"
          :max="48"
          :step="2"
          show-input
          :show-input-controls="false"
          input-size="small"
        />
      </el-form-item>
      
      <el-form-item label="坐标">
        <div class="coordinate-display">
          <el-input
            :model-value="formData.latlng.lat.toFixed(6)"
            readonly
            style="margin-bottom: 8px"
          >
            <template #prepend>纬度</template>
          </el-input>
          <el-input
            :model-value="formData.latlng.lng.toFixed(6)"
            readonly
          >
            <template #prepend>经度</template>
          </el-input>
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
  point: {
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
  icon: '📍',
  color: '#409eff',
  size: 24,
  latlng: { lat: 0, lng: 0 }
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入点位名称', trigger: 'blur' }
  ]
}

// 图标选项
const iconOptions = [
  { value: '📍', name: '图钉' },
  { value: '📌', name: '大头针' },
  { value: '🏠', name: '房屋' },
  { value: '🏢', name: '建筑' },
  { value: '🏪', name: '商店' },
  { value: '⭐', name: '星星' },
  { value: '🔴', name: '红点' },
  { value: '🔵', name: '蓝点' },
  { value: '🟢', name: '绿点' },
  { value: '🟡', name: '黄点' },
  { value: '🚩', name: '旗帜' },
  { value: '📡', name: '信号' }
]

// 颜色预设
const colorPresets = [
  '#409eff',
  '#67c23a',
  '#e6a23c',
  '#f56c6c',
  '#909399',
  '#ff4d4f',
  '#52c41a',
  '#1890ff',
  '#722ed1',
  '#eb2f96'
]

// 监听对话框显示状态
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val && props.point) {
    // 初始化表单数据
    Object.assign(formData, {
      name: props.point.name || '',
      description: props.point.description || '',
      icon: props.point.icon || '📍',
      color: props.point.color || '#409eff',
      size: props.point.size || 24,
      latlng: { ...props.point.latlng }
    })
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 获取图标名称
const getIconName = (iconValue) => {
  const icon = iconOptions.find(item => item.value === iconValue)
  return icon ? icon.name : '未知'
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
.icon-selector {
  .current-icon {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    
    .icon-display {
      font-size: 20px;
      margin-right: 8px;
    }
    
    .icon-name {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }
  
  .icon-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    
    .icon-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
      
      &.active {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-8);
      }
      
      .icon {
        font-size: 18px;
        margin-bottom: 4px;
      }
      
      .name {
        font-size: 12px;
        color: var(--el-text-color-regular);
        text-align: center;
      }
    }
  }
}

.coordinate-display {
  width: 100%;
}

.dialog-footer {
  text-align: right;
}
</style>