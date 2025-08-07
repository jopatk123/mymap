<template>
  <div class="kml-style-editor">
    <!-- 点样式 -->
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
        
        <el-form-item label="标签大小">
          <el-slider
            v-model="localStyles.point_label_size"
            :min="0"
            :max="24"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="标签颜色">
          <el-color-picker 
            v-model="localStyles.point_label_color"
            @change="handleChange"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 线样式 -->
    <div class="style-section">
      <h4>线条样式</h4>
      
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="线条颜色">
          <el-color-picker 
            v-model="localStyles.line_color"
            @change="handleChange"
            show-alpha
          />
        </el-form-item>
        
        <el-form-item label="线条宽度">
          <el-slider
            v-model="localStyles.line_width"
            :min="1"
            :max="10"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="线条透明度">
          <el-slider
            v-model="localStyles.line_opacity"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="线条样式">
          <el-select v-model="localStyles.line_style" @change="handleChange">
            <el-option label="实线" value="solid" />
            <el-option label="虚线" value="dashed" />
            <el-option label="点线" value="dotted" />
            <el-option label="点划线" value="dash-dot" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 面样式 -->
    <div class="style-section">
      <h4>面样式</h4>
      
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="填充颜色">
          <el-color-picker 
            v-model="localStyles.polygon_fill_color"
            @change="handleChange"
            show-alpha
          />
        </el-form-item>
        
        <el-form-item label="填充透明度">
          <el-slider
            v-model="localStyles.polygon_fill_opacity"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="边框颜色">
          <el-color-picker 
            v-model="localStyles.polygon_stroke_color"
            @change="handleChange"
            show-alpha
          />
        </el-form-item>
        
        <el-form-item label="边框宽度">
          <el-slider
            v-model="localStyles.polygon_stroke_width"
            :min="1"
            :max="10"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="边框样式">
          <el-select v-model="localStyles.polygon_stroke_style" @change="handleChange">
            <el-option label="实线" value="solid" />
            <el-option label="虚线" value="dashed" />
            <el-option label="点线" value="dotted" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 聚合样式 -->
    <div class="style-section">
      <h4>聚合样式</h4>
      
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="启用聚合">
          <el-switch 
            v-model="localStyles.cluster_enabled"
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="聚合图标颜色">
          <el-color-picker 
            v-model="localStyles.cluster_icon_color"
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="聚合文字颜色">
          <el-color-picker 
            v-model="localStyles.cluster_text_color"
            @change="handleChange"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 预览 -->
    <div class="preview-section">
      <h4>预览效果</h4>
      <div class="style-preview">
        <StylePreview :style-config="localStyles" :show-full-preview="true" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import StylePreview from '@/components/map/styles/StylePreview.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      point_color: '#ff7800',
      point_size: 8,
      point_opacity: 1.0,
      point_label_size: 12,
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
      cluster_enabled: true,
      cluster_icon_color: '#ffffff',
      cluster_text_color: '#000000'
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
  cluster_enabled: true,
  cluster_icon_color: '#ffffff',
  cluster_text_color: '#000000'
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
</script>

<style lang="scss" scoped>
.kml-style-editor {
  max-height: 500px;
  overflow-y: auto;
  
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
    .style-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
      background-color: #f5f7fa;
      border-radius: 6px;
      padding: 10px;
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