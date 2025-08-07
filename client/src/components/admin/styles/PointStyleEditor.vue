<template>
  <div class="point-style-editor">
    <div class="style-section">
      <h4>点标记样式</h4>
      
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="标记颜色">
          <el-color-picker 
            v-model="localStyles.point_color"
            @change="handleChange"
            show-alpha
          />
        </el-form-item>
        
        <el-form-item label="标记大小">
          <el-slider
            v-model="localStyles.point_size"
            :min="4"
            :max="32"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="透明度">
          <el-slider
            v-model="localStyles.point_opacity"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <div class="style-section">
      <h4>标签样式</h4>
      
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="字体大小">
          <el-slider
            v-model="localStyles.point_label_size"
            :min="0"
            :max="24"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="字体颜色">
          <el-color-picker 
            v-model="localStyles.point_label_color"
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
            v-if="localStyles.point_label_size > 0"
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
import { reactive, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      point_color: '#ff7800',
      point_size: 8,
      point_opacity: 1.0,
      point_label_size: 12,
      point_label_color: '#000000'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 本地样式状态
const localStyles = reactive({
  point_color: '#ff7800',
  point_size: 8,
  point_opacity: 1.0,
  point_label_size: 12,
  point_label_color: '#000000'
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
  return {
    backgroundColor: 'transparent',
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${localStyles.point_size * 2}" height="${localStyles.point_size * 3.2}" viewBox="0 0 25 41">
        <path fill="${localStyles.point_color}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${localStyles.point_opacity}"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
        <circle fill="${localStyles.point_color}" cx="12.5" cy="12.5" r="3" opacity="${localStyles.point_opacity}"/>
      </svg>
    `)}")`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    width: `${localStyles.point_size * 2}px`,
    height: `${localStyles.point_size * 3.2}px`,
    position: 'relative',
    display: 'inline-block'
  }
})

const labelStyle = computed(() => ({
  fontSize: `${localStyles.point_label_size}px`,
  color: localStyles.point_label_color
}))
</script>

<style lang="scss" scoped>
.point-style-editor {
  .style-section {
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
    
    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    h4 {
      margin: 0 0 12px 0;
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
      height: 60px;
      background-color: #f5f7fa;
      border-radius: 6px;
      position: relative;
      padding-top: 15px;
      
      .preview-point {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .preview-label {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 4px;
        white-space: nowrap;
        font-weight: 500;
        padding: 2px 5px;
        background-color: rgba(255, 255, 255, 0.75);
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
      }
    }
  }
}

:deep(.el-slider__input) {
  width: 80px;
}

:deep(.compact-form) {
  .el-form-item {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}
</style>