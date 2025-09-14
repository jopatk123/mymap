<template>
  <div class="polygon-style-editor">
    <div class="style-section">
      <h4>填充样式</h4>

      <el-form label-width="100px" size="small">
        <el-form-item label="填充颜色">
          <el-color-picker v-model="fillColorPicker" show-alpha @change="handleChange" />
        </el-form-item>

        <el-form-item label="填充透明度">
          <el-slider
            v-model="localStyles.fillOpacity"
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
      <h4>边框样式</h4>

      <el-form label-width="100px" size="small">
        <el-form-item label="边框颜色">
          <el-color-picker v-model="strokeColorPicker" show-alpha @change="handleChange" />
        </el-form-item>

        <el-form-item label="边框宽度">
          <el-slider
            v-model="localStyles.strokeWidth"
            :min="1"
            :max="20"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>

        <el-form-item label="边框样式">
          <el-select v-model="localStyles.strokeStyle" style="width: 100%" @change="handleChange">
            <el-option label="实线" value="solid" />
            <el-option label="虚线" value="dashed" />
            <el-option label="点线" value="dotted" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="preview-section">
      <h4>预览效果</h4>
      <div class="polygon-preview">
        <svg width="100%" height="80" viewBox="0 0 200 80">
          <polygon
            points="50,20 150,20 170,40 150,60 50,60 30,40"
            :fill="localStyles.fillColor"
            :fill-opacity="localStyles.fillOpacity"
            :stroke="localStyles.strokeColor"
            :stroke-width="localStyles.strokeWidth"
            :stroke-dasharray="getDashArray(localStyles.strokeStyle)"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue';
import { hexToRgba, rgbaToHex } from '@/utils/color-utils.js';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      fillColor: '#ff7800',
      fillOpacity: 0.3,
      strokeColor: '#ff7800',
      strokeWidth: 2,
      strokeStyle: 'solid',
    }),
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

// 本地样式状态
const localStyles = reactive({
  fillColor: '#ff7800',
  fillOpacity: 0.3,
  strokeColor: '#ff7800',
  strokeWidth: 2,
  strokeStyle: 'solid',
});

// 填充颜色的计算属性
const fillColorPicker = computed({
  get() {
    return localStyles.fillColor.startsWith('rgba')
      ? localStyles.fillColor
      : hexToRgba(localStyles.fillColor);
  },
  set(newValue) {
    localStyles.fillColor = rgbaToHex(newValue);
  },
});

// 边框颜色的计算属性
const strokeColorPicker = computed({
  get() {
    return localStyles.strokeColor.startsWith('rgba')
      ? localStyles.strokeColor
      : hexToRgba(localStyles.strokeColor);
  },
  set(newValue) {
    localStyles.strokeColor = rgbaToHex(newValue);
  },
});

// 监听props变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      Object.assign(localStyles, newValue);
    }
  },
  { immediate: true, deep: true }
);

// 处理样式变化
const handleChange = () => {
  emit('update:modelValue', { ...localStyles });
  emit('change');
};

// 获取虚线样式
const getDashArray = (style) => {
  const dashPatterns = {
    solid: 'none',
    dashed: '8,4',
    dotted: '2,2',
  };
  return dashPatterns[style] || 'none';
};
</script>

<style lang="scss" scoped>
.polygon-style-editor {
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
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .polygon-preview {
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
