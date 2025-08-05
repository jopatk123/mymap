<template>
  <div class="style-preview">
    <div class="preview-items">
      <!-- 点样式预览 -->
      <div 
        class="preview-point"
        :style="pointStyle"
        :title="`点: ${styleConfig.point_color || '#ff7800'}`"
      ></div>
      
      <!-- 线样式预览 -->
      <svg width="30" height="20" class="preview-line">
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
      
      <!-- 面样式预览 -->
      <svg width="20" height="20" class="preview-polygon">
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
      
      <!-- 聚合状态指示 -->
      <div 
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
  }
})

// 点样式
const pointStyle = computed(() => ({
  backgroundColor: props.styleConfig.point_color || '#ff7800',
  width: `${Math.min((props.styleConfig.point_size || 8), 12)}px`,
  height: `${Math.min((props.styleConfig.point_size || 8), 12)}px`,
  opacity: props.styleConfig.point_opacity || 1.0
}))

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