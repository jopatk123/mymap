<!-- 点位信息弹窗组件 -->
<template>
  <el-popover
    :visible="visible"
    :virtual-ref="triggerRef"
    virtual-triggering
    placement="top"
    :width="300"
    trigger="manual"
    @hide="$emit('close')"
  >
    <div class="point-info-popup">
      <div class="popup-header">
        <h4 class="title">{{ point?.name || '未命名点位' }}</h4>
        <el-button type="text" size="small" class="close-btn" @click="$emit('close')">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <div v-if="point" class="popup-content">
        <div v-if="point.description" class="info-item">
          <span class="label">描述：</span>
          <span class="value">{{ point.description }}</span>
        </div>

        <div class="info-item">
          <span class="label">坐标：</span>
          <span class="value">
            {{ formatCoordinate(point.latlng.lat) }}, {{ formatCoordinate(point.latlng.lng) }}
          </span>
        </div>

        <div v-if="point.timestamp" class="info-item">
          <span class="label">创建时间：</span>
          <span class="value">{{ formatDate(point.timestamp) }}</span>
        </div>

        <div class="popup-actions">
          <el-button type="primary" size="small" @click="$emit('edit-properties')">
            编辑属性
          </el-button>
          <el-button type="text" size="small" class="copy-btn" @click="copyPointCoords(point)"
            >复制经纬度</el-button
          >
          <el-button type="danger" size="small" @click="$emit('delete-point')"> 删除 </el-button>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { Close } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  point: {
    type: Object,
    default: null,
  },
  triggerRef: {
    type: Object,
    default: null,
  },
});

defineEmits(['close', 'edit-properties', 'delete-point']);

// 格式化坐标显示
const formatCoordinate = (coord) => {
  return typeof coord === 'number' ? coord.toFixed(6) : coord;
};

// 格式化日期显示
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-CN');
};

const copyPointCoords = async (point) => {
  const lat = Number(point?.latlng?.lat ?? point?.latitude ?? 0);
  const lng = Number(point?.latlng?.lng ?? point?.longitude ?? 0);
  if (!isFinite(lat) || !isFinite(lng)) {
    ElMessage.error('无效的坐标，无法复制');
    return;
  }
  const formatted = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(formatted);
    } else {
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
.point-info-popup {
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .close-btn {
      padding: 4px;
      margin: 0;
    }
  }

  .popup-content {
    .info-item {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;

      .label {
        min-width: 70px;
        font-weight: 500;
        color: var(--el-text-color-regular);
      }

      .value {
        color: var(--el-text-color-primary);
        word-break: break-all;
      }
    }

    .popup-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;

      .copy-btn {
        background-color: #e6ffed !important; /* 浅绿色背景 */
        color: #1f7a2f !important;
        border-radius: 4px;
        padding: 4px 8px;
      }

      .copy-btn:hover {
        background-color: #d4f8d9 !important;
      }
    }
  }
}
</style>
