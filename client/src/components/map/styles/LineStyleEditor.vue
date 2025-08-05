<template>
  <div class="line-style-editor">
    <div class="style-section">
      <h4>线条样式</h4>
      
      <el-form label-width="100px" size="small">
        <el-form-item label="线条颜色">
          <el-color-picker 
            v-model="pickerColor"
            @change="handleChange"
            show-alpha
          />
        </el-form-item>
        
        <el-form-item label="线条宽度">
          <el-slider
            v-model="localStyles.width"
            :min="1"
            :max="20"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="透明度">
          <el-slider
            v-model="localStyles.opacity"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="线条样式">
          <el-select 
            v-model="localStyles.style"
            @change="handleChange"
            style="width: 100%"
          >
            <el-option label="实线" value="solid" />
            <el-option label="虚线" value="dashed" />
            <el-option label="点线" value="dotted" />
            <el-option label="点划线" value="dash-dot" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="preview-section">
      <h4>预览效果</h4>
      <div class="line-preview">
        <svg width="100%" height="60" viewBox="0 0 200 60">
          <line
            x1="20"
            y1="30"
            x2="180"
            y2="30"
            :stroke="localStyles.color"
            :stroke-width="localStyles.width"
            :stroke-opacity="localStyles.opacity"
            :stroke-dasharray="getDashArray(localStyles.style)"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'
import { hexToRgba, rgbaToHex } from '@/utils/color-utils.js'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      color: '#ff7800',
      width: 2,
      opacity: 0.8,
      style: 'solid'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 本地样式状态
const localStyles = reactive({
  color: '#ff7800',
  width: 2,
  opacity: 0.8,
  style: 'solid'
})

// 用于颜色选择器的计算属性
const pickerColor = computed({
  get() {
    return localStyles.color.startsWith('rgba') ? localStyles.color : hexToRgba(localStyles.color)
  },
  set(newValue) {
    localStyles.color = rgbaToHex(newValue)
  }
})

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    Object.assign(localStyles, newValue)
  }
}, { immediate: true, deep: true })

// 处理样式变化
const handleChange = () => {
  emit('update:modelValue', { ...localStyles })
  emit('change')
}

// 获取虚线样式
const getDashArray = (style) => {
  const dashPatterns = {
    solid: 'none',
    dashed: '10,5',
    dotted: '2,3',
    'dash-dot': '10,5,2,5'
  }
  return dashPatterns[style] || 'none'
}
</script>

<style lang="scss" scoped>
.line-style-editor {
  .style-section {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
    
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .preview-section {
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
    
    .line-preview {
      background-color: #f5f7fa;
      border-radius: 6px;
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

:deep(.el-slider__input) {
  width: 80px;
}
</style>