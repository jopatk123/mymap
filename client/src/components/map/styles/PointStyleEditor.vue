<template>
  <div class="point-style-editor">
    <div class="style-section">
      <h4>点标记样式</h4>

      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="是否显示点位">
          <el-checkbox v-model="localStyles.visible" @change="handleChange">
            显示点位
          </el-checkbox>
        </el-form-item>

        <el-form-item label="标记颜色">
          <el-color-picker v-model="localStyles.color" show-alpha @change="handleChange" />
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
      </el-form>
    </div>

    <div class="style-section">
      <h4>标签样式</h4>

      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="字体大小">
          <el-slider
            v-model="localStyles.labelSize"
            :min="0"
            :max="24"
            :step="1"
            show-input
            @change="handleChange"
          />
        </el-form-item>

        <el-form-item label="字体颜色">
          <el-color-picker v-model="localStyles.labelColor" @change="handleChange" />
        </el-form-item>
      </el-form>
    </div>

    <div class="style-section">
      <h4>聚合显示</h4>
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="启用聚合">
          <el-switch v-model="localStyles.clusterEnabled" @change="handleChange" />
        </el-form-item>
        <el-form-item v-if="localStyles.clusterEnabled" label="聚合颜色">
          <el-color-picker v-model="localStyles.clusterColor" show-alpha @change="handleChange" />
        </el-form-item>
      </el-form>
    </div>

    <div class="preview-section">
      <h4>预览效果</h4>
      <div class="point-preview">
        <div class="preview-point" :style="previewStyle">
          <span v-show="localStyles.labelSize > 0" class="preview-label" :style="labelStyle">
            示例点位
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
// Some reactive helpers are used in template; mark as referenced to satisfy linters in edge cases
void ref;

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
        visible: true,
      opacity: 1.0,
      color: '#ff7800',
      size: 8,
      labelSize: 0,
      labelColor: '#000000',
      clusterEnabled: false,
      clusterColor: '#00ff00',
    }),
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

// 本地样式状态
const localStyles = reactive({
    visible: true,
  opacity: 1.0,
  color: '#ff7800',
  size: 8,
  labelSize: 0,
  labelColor: '#000000',
  clusterEnabled: false,
  clusterColor: '#00ff00',
});

// 监听props变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      // 仅拷贝允许的字段，避免将 color/size 等旧字段再次引入
      const allowed = {
          visible: newValue.visible !== false,
        opacity: newValue.opacity,
        color: newValue.color,
        // 强制为数字，防止字符串导致后续计算出现 NaN
        size: Number(newValue.size) || 8,
        labelSize: Number(newValue.labelSize) || 0,
        labelColor: newValue.labelColor,
        clusterEnabled: newValue.clusterEnabled,
        clusterColor: newValue.clusterColor,
      };
      Object.assign(localStyles, allowed);
    }
  },
  { immediate: true, deep: true }
);

// 处理样式变化
const handleChange = () => {
  // 发出仅包含允许字段的值，不包括 color/size
  emit('update:modelValue', {
      visible: localStyles.visible !== false,
    opacity: Number(localStyles.opacity) || 1.0,
    color: localStyles.color,
    // 保证发送到父级的是数字类型
    size: Number(localStyles.size) || 8,
    labelSize: Number(localStyles.labelSize) || 0,
    labelColor: localStyles.labelColor,
    clusterEnabled: !!localStyles.clusterEnabled,
    clusterColor: localStyles.clusterColor,
  });
  emit('change');
};

// 预览样式 - 固定使用marker形状
const previewStyle = computed(() => {
  // 使用固定颜色和大小展示预览（颜色/大小不再是可配置项）
  // 使用当前配置的颜色和大小来实时预览
  const previewColor = localStyles.color || '#ff7800';
  // 强制为数字并使用默认值，避免字符串或 undefined 导致乘法出现 NaN
  const previewSize = Number(localStyles.size) || 8;
  return {
    backgroundColor: 'transparent',
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${previewSize * 2}" height="${
      previewSize * 3.2
    }" viewBox="0 0 25 41">
        <path fill="${previewColor}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${
      localStyles.opacity
    }"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="${Math.max(3, Math.floor(previewSize * 0.75))}"/>
        <circle fill="${previewColor}" cx="12.5" cy="12.5" r="${Math.max(
      2,
      Math.floor(previewSize * 0.38)
    )}" opacity="${localStyles.opacity}"/>
      </svg>
    `)}")`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    width: `${previewSize * 2}px`,
    height: `${previewSize * 3.2}px`,
    position: 'relative',
    display: 'inline-block',
  };
});

const labelStyle = computed(() => ({
  fontSize: `${localStyles.labelSize}px`,
  color: localStyles.labelColor,
}));
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
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
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
