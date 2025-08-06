<template>
  <div class="style-preview">
    <div class="preview-items">
      <!-- 点样式预览 -->
      <div 
        class="preview-point"
        :style="pointStyle"
        :title="`点: ${getPointColor()}`"
      ></div>
      
      <!-- 线样式预览（仅在KML样式中显示） -->
      <svg v-if="showFullPreview" width="30" height="20" class="preview-line">
        <line
          x1="2"
          y1="10"
          x2="28"
          y2="10"
          :stroke="styleConfig.line_color || '#ff7800'"
          :stroke-width="Math.min(styleConfig.line_width || 2, 3)"
          :stroke-dasharray="getLineDashArray(styleConfig.line_style)"
          stroke-linecap="round"
        />
      </svg>
      
      <!-- 面样式预览（仅在KML样式中显示） -->
      <svg v-if="showFullPreview" width="20" height="20" class="preview-polygon">
        <rect
          x="2"
          y="2"
          width="16"
          height="16"
          :fill="styleConfig.polygon_fill_color || '#ff7800'"
          :fill-opacity="styleConfig.polygon_fill_opacity || 0.3"
          :stroke="styleConfig.polygon_stroke_color || '#ff7800'"
          :stroke-width="Math.min(styleConfig.polygon_stroke_width || 2, 2)"
        />
      </svg>
      
      <!-- 聚合状态指示（仅在KML样式中显示） -->
      <div 
        v-if="showFullPreview"
        class="cluster-indicator"
        :class="{ enabled: styleConfig.cluster_enabled !== false }"
        :title="styleConfig.cluster_enabled !== false ? '已启用聚合' : '未启用聚合'"
      >
        <i class="el-icon-connection"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  styleConfig: {
    type: Object,
    default: () => ({})
  },
  // 是否显示完整预览（包括线、面、聚合），false时只显示点预览
  showFullPreview: {
    type: Boolean,
    default: true
  }
})

// 获取点颜色（兼容不同的数据格式）
const getPointColor = () => {
  return props.styleConfig.point_color || props.styleConfig.color || '#ff7800'
}

// 点样式
const pointStyle = computed(() => {
  const color = getPointColor()
  const size = props.styleConfig.point_size || props.styleConfig.size || 8
  const opacity = props.styleConfig.point_opacity || props.styleConfig.opacity || 1.0
  
  return {
    backgroundColor: color,
    width: `${size}px`,
    height: `${size}px`,
    opacity: opacity,
    borderRadius: '50%'
  }
})

// 获取线条虚线样式
const getLineDashArray = (style) => {
  const dashPatterns = {
    solid: 'none',
    dashed: '4,2',
    dotted: '1,1',
    'dash-dot': '4,2,1,2'
  }
  return dashPatterns[style] || 'none'
}
</script>

<style lang="scss" scoped>
.style-preview {
  .preview-items {
    display: flex;
    align-items: center;
    gap: 6px;
    
    .preview-point {
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .preview-line {
      flex-shrink: 0;
    }
    
    .preview-polygon {
      flex-shrink: 0;
    }
    
    .cluster-indicator {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
      
      &.enabled {
        background-color: #67c23a;
        color: white;
      }
      
      &:not(.enabled) {
        background-color: #dcdfe6;
        color: #909399;
      }
    }
  }
}
</style>
