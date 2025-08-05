<template>
  <div class="cluster-style-editor">
    <div class="style-section">
      <h4>聚合开关</h4>
      
      <el-form label-width="120px" size="small">
        <el-form-item label="启用聚合">
          <el-switch
            v-model="localStyles.enabled"
            @change="handleChange"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <div class="style-section" v-if="localStyles.enabled">
      <h4>聚合参数</h4>
      
      <el-form label-width="120px" size="small">
        <el-form-item label="聚合半径">
          <el-slider
            v-model="localStyles.radius"
            :min="10"
            :max="200"
            :step="5"
            show-input
            @change="handleChange"
          />
          <div class="param-desc">点位间距离小于此值时会聚合（像素）</div>
        </el-form-item>
        
        <el-form-item label="最小聚合点数">
          <el-slider
            v-model="localStyles.minPoints"
            :min="2"
            :max="20"
            :step="1"
            show-input
            @change="handleChange"
          />
          <div class="param-desc">达到此数量的点位才会聚合</div>
        </el-form-item>
        
        <el-form-item label="最大聚合级别">
          <el-slider
            v-model="localStyles.maxZoom"
            :min="10"
            :max="20"
            :step="1"
            show-input
            @change="handleChange"
          />
          <div class="param-desc">超过此缩放级别不再聚合</div>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="style-section" v-if="localStyles.enabled">
      <h4>聚合外观</h4>
      
      <el-form label-width="120px" size="small">
        <el-form-item label="聚合图标颜色">
          <el-color-picker 
            v-model="localStyles.iconColor"
            @change="handleChange"
          />
        </el-form-item>
        
        <el-form-item label="文字颜色">
          <el-color-picker 
            v-model="localStyles.textColor"
            @change="handleChange"
          />
        </el-form-item>
      </el-form>
    </div>
    
    <div class="preview-section" v-if="localStyles.enabled">
      <h4>预览效果</h4>
      <div class="cluster-preview">
        <div class="cluster-examples">
          <div 
            class="cluster-icon small"
            :style="getClusterStyle(5)"
          >
            5
          </div>
          <div 
            class="cluster-icon medium"
            :style="getClusterStyle(15)"
          >
            15
          </div>
          <div 
            class="cluster-icon large"
            :style="getClusterStyle(50)"
          >
            50
          </div>
        </div>
        <div class="preview-desc">
          不同数量的聚合图标效果
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      enabled: true,
      radius: 50,
      minPoints: 2,
      maxZoom: 16,
      iconColor: '#409EFF',
      textColor: '#FFFFFF'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 本地样式状态
const localStyles = reactive({
  enabled: true,
  radius: 50,
  minPoints: 2,
  maxZoom: 16,
  iconColor: '#409EFF',
  textColor: '#FFFFFF'
})

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  Object.assign(localStyles, newValue)
}, { immediate: true, deep: true })

// 处理样式变化
const handleChange = () => {
  emit('update:modelValue', { ...localStyles })
  emit('change')
}

// 获取聚合图标样式
const getClusterStyle = (count) => {
  let size = 30
  if (count >= 10) size = 40
  if (count >= 25) size = 50
  
  return {
    backgroundColor: localStyles.iconColor,
    color: localStyles.textColor,
    width: `${size}px`,
    height: `${size}px`,
    lineHeight: `${size}px`
  }
}
</script>

<style lang="scss" scoped>
.cluster-style-editor {
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
    
    .param-desc {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
  
  .preview-section {
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
    
    .cluster-preview {
      background-color: #f5f7fa;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      
      .cluster-examples {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        margin-bottom: 12px;
        
        .cluster-icon {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s;
          
          &.small {
            width: 30px;
            height: 30px;
          }
          
          &.medium {
            width: 40px;
            height: 40px;
            font-size: 14px;
          }
          
          &.large {
            width: 50px;
            height: 50px;
            font-size: 16px;
          }
        }
      }
      
      .preview-desc {
        font-size: 12px;
        color: #666;
      }
    }
  }
}

:deep(.el-slider__input) {
  width: 80px;
}
</style>