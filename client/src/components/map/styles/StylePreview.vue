<template>
  <div class="style-preview">
    <div class="preview-items">
      <!-- 点样式预览 -->
      <div class="preview-point" :style="pointStyle" :title="`点: ${getPointColor()}`"></div>

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

      <!-- 聚合预览（仅颜色演示，不提供额外设置） -->
      <div
        v-if="showFullPreview && showClusterPreview"
        class="preview-cluster"
        :style="clusterPreviewStyle"
      >
        12
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  styleConfig: {
    type: Object,
    default: () => ({}),
  },
  // 是否显示完整预览（包括线、面、聚合），false时只显示点预览
  showFullPreview: {
    type: Boolean,
    default: true,
  },
});

// 获取点颜色（兼容不同的数据格式）
const getPointColor = () => {
  return props.styleConfig.point_color || props.styleConfig.color || '#ff7800';
};

// 点样式
const pointStyle = computed(() => {
  const color = getPointColor();
  // 强制为数字并提供默认值，避免字符串或 undefined 导致 NaN
  const size = Number(props.styleConfig.point_size ?? props.styleConfig.size) || 8;
  const opacity = Number(props.styleConfig.point_opacity ?? props.styleConfig.opacity) || 1.0;

  return {
    backgroundColor: color,
    width: `${size}px`,
    height: `${size}px`,
    opacity: opacity,
    borderRadius: '50%',
  };
});

// 是否展示聚合预览（样式中存在 cluster_enabled）
const showClusterPreview = computed(() => {
  return (
    props.styleConfig &&
    (props.styleConfig.cluster_enabled === true || props.styleConfig.clusterEnabled === true)
  );
});

// 聚合预览样式（简单色块）
const clusterPreviewStyle = computed(() => {
  const color =
    props.styleConfig.cluster_color || props.styleConfig.clusterColor || getPointColor();
  return {
    backgroundColor: color,
    color: '#fff',
    borderRadius: '12px',
    padding: '0 6px',
    height: '20px',
    lineHeight: '20px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block',
    marginLeft: '2px',
  };
});

// 获取线条虚线样式
const getLineDashArray = (style) => {
  const dashPatterns = {
    solid: 'none',
    dashed: '4,2',
    dotted: '1,1',
    'dash-dot': '4,2,1,2',
  };
  return dashPatterns[style] || 'none';
};
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
  }
}
</style>
