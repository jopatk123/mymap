<!-- 点位属性编辑对话框 -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑点位属性"
    width="500px"
    :before-close="handleClose"
    append-to-body
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
      label-position="left"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入点位名称" clearable />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="请输入点位描述"
          :rows="3"
          clearable
        />
      </el-form-item>

      <el-form-item label="图标">
        <div class="icon-selector">
          <div class="current-icon">
            <span class="icon-display">{{ formData.icon }}</span>
            <span class="icon-name">{{ getIconName(formData.icon) }}</span>
          </div>
          <div class="icon-options">
            <div
              v-for="icon in iconOptions"
              :key="icon.value"
              class="icon-option"
              :class="{ active: formData.icon === icon.value }"
              @click="formData.icon = icon.value"
            >
              <span class="icon">{{ icon.value }}</span>
              <span class="name">{{ icon.name }}</span>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="坐标">
        <div class="coordinate-display">
          <el-input
            v-model.number="formData.latlng.lat"
            style="margin-bottom: 8px"
            type="number"
            :step="0.000001"
            :precision="6"
            placeholder="请输入纬度"
          >
            <template #prepend>纬度</template>
          </el-input>
          <el-input
            v-model.number="formData.latlng.lng"
            type="number"
            :step="0.000001"
            :precision="6"
            placeholder="请输入经度"
          >
            <template #prepend>经度</template>
          </el-input>

          <!-- 复制经纬度按钮：复制格式为 经度,纬度，保留6位小数，经度在前 -->
          <div class="coordinate-actions">
            <el-button type="text" size="small" @click="copyLatLng">复制经纬度</el-button>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  point: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'save']);

const dialogVisible = ref(false);
const formRef = ref(null);

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  icon: '📍',
  id: undefined,
  latlng: { lat: 0, lng: 0 },
});

// 表单验证规则
const formRules = {
  name: [{ required: true, message: '请输入点位名称', trigger: 'blur' }],
};

// 图标选项
const iconOptions = [
  { value: '📍', name: '图钉' },
  { value: '📌', name: '大头针' },
  { value: '🏠', name: '房屋' },
  { value: '🏢', name: '建筑' },
  { value: '🏪', name: '商店' },
  { value: '⭐', name: '星星' },
  { value: '🔴', name: '红点' },
  { value: '🔵', name: '蓝点' },
  { value: '🟢', name: '绿点' },
  { value: '🟡', name: '黄点' },
  { value: '🚩', name: '旗帜' },
  { value: '📡', name: '信号' },
];

// 颜色相关已移除（由上层样式统一管理）

// 监听对话框显示状态
watch(
  () => props.modelValue,
  (val) => {
    dialogVisible.value = val;
    if (val) {
      // debug: PointPropertiesDialog opened (suppressed)
      const p = props.point || {};
      // 初始化表单数据，添加默认名称
      const defaultName =
        p.name && String(p.name).trim() ? p.name : `点位${Date.now().toString().slice(-6)}`;
      const lat = Number(p?.latlng?.lat ?? 0);
      const lng = Number(p?.latlng?.lng ?? 0);
      Object.assign(formData, {
        id: p.id,
        name: defaultName,
        description: p.description || '',
        icon: p.icon || '📍',
        latlng: { lat: isFinite(lat) ? lat : 0, lng: isFinite(lng) ? lng : 0 },
      });
    }
  }
);

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

// 获取图标名称
const getIconName = (iconValue) => {
  const icon = iconOptions.find((item) => item.value === iconValue);
  return icon ? icon.name : '未知';
};

// 处理关闭
const handleClose = () => {
  dialogVisible.value = false;
};

// 处理保存
const handleSave = async () => {
  try {
    await formRef.value?.validate();
    // 不再直接修改 props.point（会触发 vue/no-mutating-props）。
    // 父组件通过监听 'save' 事件接收更新并负责把变更写入其状态。

    // emit minimal save payload; parent will use selectedPoint or id to locate the drawing
    emit('save', { id: formData.id, ...formData });
    handleClose();
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 复制经纬度到剪贴板，格式：经度,纬度（经度在前，纬度在后），保留6位小数
const copyLatLng = async () => {
  const lat = Number(formData.latlng.lat ?? 0);
  const lng = Number(formData.latlng.lng ?? 0);
  if (!isFinite(lat) || !isFinite(lng)) {
    ElMessage.error('无效的坐标，无法复制');
    return;
  }
  const formatted = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  // 首选 Clipboard API
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(formatted);
    } else {
      // 回退：使用临时 textarea
      const ta = document.createElement('textarea');
      ta.value = formatted;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (!ok) throw new Error('execCommand failed');
    }
    ElMessage.success('坐标已复制：' + formatted);
  } catch (e) {
    console.error('复制失败', e);
    ElMessage.error('复制失败，请手动复制：' + formatted);
  }
};
</script>

<style lang="scss" scoped>
.icon-selector {
  .current-icon {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;

    .icon-display {
      font-size: 20px;
      margin-right: 8px;
    }

    .icon-name {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }

  .icon-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;

    .icon-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }

      &.active {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-8);
      }

      .icon {
        font-size: 18px;
        margin-bottom: 4px;
      }

      .name {
        font-size: 12px;
        color: var(--el-text-color-regular);
        text-align: center;
      }
    }
  }
}

.coordinate-display {
  width: 100%;
}

.dialog-footer {
  text-align: right;
}
</style>
