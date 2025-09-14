<template>
  <el-dialog
    v-model="visible"
    title="点位图标设置"
    width="80%"
    :close-on-click-modal="false"
    class="point-style-dialog"
    top="5vh"
  >
    <div class="point-style-container">
      <!-- 左侧：点位类型选择 -->
      <PointTypeSelector
        v-model:selected-type="selectedPointType"
        :video-styles="videoStyles"
        :panorama-styles="panoramaStyles"
      />

      <!-- 右侧：样式编辑器 -->
      <div class="style-editor-panel">
        <div v-if="selectedPointType" class="editor-content">
          <div class="editor-header">
            <h4>{{ selectedPointType === 'video' ? '视频点位' : '全景图点位' }}样式设置</h4>
          </div>

          <PointStyleEditor
            v-model="currentStyles"
            @update:model-value="handleStyleUpdate"
            @change="handleStyleChange"
          />
        </div>

        <div v-else class="no-selection">
          <el-empty description="请选择要配置的点位类型" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="warning" :disabled="!selectedPointType" @click="handleReset">
          重置为默认
        </el-button>

        <el-button
          type="primary"
          :loading="saving"
          :disabled="!selectedPointType"
          @click="handleSave"
        >
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import PointStyleEditor from './styles/PointStyleEditor.vue';
import StylePreview from './styles/StylePreview.vue';
import PointTypeSelector from './PointTypeSelector.vue';
import { usePointStyle } from '@/composables/use-point-style.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'styles-updated']);

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const selectedPointType = ref('');

// 使用组合式函数
const {
  saving,
  videoStyles,
  panoramaStyles,
  currentStyles,
  loadAllStyles,
  setCurrentStyles,
  saveStyles,
  resetStyles,
  restoreOriginalStyles,
} = usePointStyle();

// 监听对话框显示状态
watch(visible, async (newVisible) => {
  if (newVisible) {
    await loadAllStyles();

    // 重置选择状态
    selectedPointType.value = '';

    // 默认选择视频点位
    setTimeout(() => {
      selectedPointType.value = 'video';
    }, 100);
  } else {
    // 清理状态
    selectedPointType.value = '';
    Object.keys(currentStyles).forEach((key) => delete currentStyles[key]);
  }
});

// 监听点位类型变化
watch(selectedPointType, (newType) => {
  if (newType) {
    setCurrentStyles(newType);
  }
});

// 处理样式更新（v-model）
const handleStyleUpdate = (newStyles) => {
  if (newStyles) {
    // 清空并重新赋值currentStyles
    Object.keys(currentStyles).forEach((key) => delete currentStyles[key]);
    Object.assign(currentStyles, newStyles);
  }
};

// 处理样式变化
const handleStyleChange = () => {
  // 实时更新预览
  if (selectedPointType.value === 'video') {
    videoStyles.value = { ...currentStyles };
  } else if (selectedPointType.value === 'panorama') {
    panoramaStyles.value = { ...currentStyles };
  }
};

// 保存配置
const handleSave = async () => {
  const success = await saveStyles(selectedPointType.value);
  if (success) {
    emit('styles-updated');
  }
};

// 重置为默认
const handleReset = async () => {
  const success = await resetStyles(selectedPointType.value);
  if (success) {
    emit('styles-updated');
  }
};

// 取消
const handleCancel = () => {
  visible.value = false;
  restoreOriginalStyles(selectedPointType.value);
};
</script>

<style lang="scss" scoped>
.point-style-dialog {
  .point-style-container {
    display: flex;
    height: 450px;
    gap: 20px;
  }

  .style-editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .editor-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .editor-header {
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e4e7ed;
        flex-shrink: 0;

        h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #303133;
        }
      }

      // 确保PointStyleEditor可以滚动
      :deep(.point-style-editor) {
        flex: 1;
        overflow-y: auto;
        padding-right: 8px;
      }
    }

    .no-selection {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>
