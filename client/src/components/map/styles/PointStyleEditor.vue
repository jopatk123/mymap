<template>
  <div class="point-style-editor">
    <div class="style-section">
      <h4>点标记样式</h4>
      
      <el-form label-width="100px" size="small">
        <el-form-item label="标记颜色">
          <el-color-picker 
            v-model="pickerColor"
            @change="handleChange"
            show-alpha
          />
        </el-form-item>
        
        <el-form-item label="标记大小">
          <el-slider
            v-model="localStyles.size"
            :min="4"
            :max="32"
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
        
        <el-form-item label="图标类型">
          <el-select 
            v-model="localStyles.iconType"
            @change="handleChange"
            style="width: 100%"
          >
            <el-option label="圆形" value="circle" />
            <el-option label="方形" value="square" />
            <el-option label="三角形" value="triangle" />
            <el-option label="菱形" value="diamond" />
            <el-option label="水滴形" value="marker" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="style-section">
      <h4>标签样式</h4>
      
      <el-form label-width="100px" size="small">
        <el-form-item label="字体大小">
          <el-slider
            v-model="localStyles.labelSize"
            :min="8"
            :max="24"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="字体颜色">
          <el-color-picker 
            v-model="localStyles.labelColor"
            @change="handleChange"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <div class="preview-section">
      <h4>预览效果</h4>
      <div class="point-preview">
        <div 
          class="preview-point"
          :style="previewStyle"
        >
          <span 
            class="preview-label"
            :style="labelStyle"
          >
            示例点位
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { hexToRgba, rgbaToHex } from '@/utils/color-utils.js'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      color: '#ff7800',
      size: 8,
      opacity: 1.0,
      iconType: 'circle',
      labelSize: 12,
      labelColor: '#000000'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 本地样式状态
const localStyles = reactive({
  color: '#ff7800',
  size: 8,
  opacity: 1.0,
  iconType: 'circle',
  labelSize: 12,
  labelColor: '#000000'
})

// 用于颜色选择器的计算属性
const pickerColor = computed({
  get() {
    // 确保始终为 color-picker 提供它能理解的格式
    return localStyles.color.startsWith('rgba') ? localStyles.color : hexToRgba(localStyles.color)
  },
  set(newValue) {
    // 当 color-picker 更新时，转换回十六进制格式
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

// 预览样式
const previewStyle = computed(() => {
  const iconShapes = {
    circle: 'border-radius: 50%',
    square: 'border-radius: 0',
    triangle: 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%)',
    diamond: 'transform: rotate(45deg)',
    marker: 'border-radius: 50% 50% 50% 0; transform: rotate(-45deg)'
  }
  
  return {
    backgroundColor: localStyles.color,
    width: `${localStyles.size * 2}px`,
    height: `${localStyles.size * 2}px`,
    opacity: localStyles.opacity,
    ...iconShapes[localStyles.iconType] && { [iconShapes[localStyles.iconType].split(':')[0]]: iconShapes[localStyles.iconType].split(':')[1] }
  }
})

const labelStyle = computed(() => ({
  fontSize: `${localStyles.labelSize}px`,
  color: localStyles.labelColor
}))
</script>

<style lang="scss" scoped>
.point-style-editor {
  .style-section {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
    
    &:last-child {
      border-bottom: none;
    }
    
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .preview-section {
    .point-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 80px;
      background-color: #f5f7fa;
      border-radius: 6px;
      position: relative;
      
      .preview-point {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .preview-label {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 4px;
        white-space: nowrap;
        font-weight: 500;
      }
    }
  }
}

:deep(.el-slider__input) {
  width: 80px;
}
</style>