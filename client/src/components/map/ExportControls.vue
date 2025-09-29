<template>
  <div class="export-controls">
    <!-- 导出按钮和格式选择 -->
    <el-dropdown
      :disabled="!hasExportableData"
      placement="bottom-start"
      trigger="click"
      @command="handleExport"
    >
      <el-button class="btn-export-data" :disabled="!hasExportableData" :loading="exporting">
        导出数据
      </el-button>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="kml">
            <el-icon><DocumentCopy /></el-icon>
            导出为KML格式 (WGS84)
          </el-dropdown-item>
          <el-dropdown-item command="csv">
            <el-icon><Grid /></el-icon>
            导出为表格格式 (CSV)
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { DocumentCopy, Grid } from '@element-plus/icons-vue';
import { kmlPointsExportService } from '@/services/panorama-export-service.js';

const props = defineProps({
  // 当前可见的KML点位数据
  visibleKMLPoints: {
    type: Array,
    default: () => [],
  },
});

const exporting = ref(false);

// 计算属性
const visibleCount = computed(() => props.visibleKMLPoints?.length || 0);
const hasExportableData = computed(() => visibleCount.value > 0);

// 生成文件名
const generateFilename = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `KML点位数据_${dateStr}`;
};

// 处理导出
const handleExport = async (format) => {
  if (!hasExportableData.value) {
    ElMessage.warning('没有可导出的KML点位数据，请先使用"圆形区域"或"自定义区域"功能显示KML点位');
    return;
  }

  try {
    exporting.value = true;
    const filename = generateFilename();
    const kmlPoints = props.visibleKMLPoints;
    const stats = kmlPointsExportService.getExportStatistics(kmlPoints);

    if (stats.validCoordinatesCount === 0) {
      ElMessage.warning('没有有效坐标的KML点位数据可导出');
      return;
    }

    switch (format) {
      case 'kml':
        await kmlPointsExportService.exportToKML(
          kmlPoints,
          filename,
          `KML点位数据导出 - ${new Date().toLocaleString()}`
        );
        ElMessage.success(`KML文件导出成功！共导出 ${stats.validCoordinatesCount} 个KML点位`);
        break;

      case 'csv':
        await kmlPointsExportService.exportToTable(kmlPoints, filename);
        ElMessage.success(`表格文件导出成功！共导出 ${stats.validCoordinatesCount} 个KML点位`);
        break;

      default:
        throw new Error('不支持的导出格式');
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message);
    console.error('Export error:', error);
  } finally {
    exporting.value = false;
  }
};

// 暴露给父组件的方法（可选）
defineExpose({
  handleExport,
});
</script>

<style scoped lang="scss">
.export-controls {
  display: inline-flex;
  align-items: center;
  height: 44px;

  .btn-export-data {
    height: 44px !important;
    min-width: 88px;
    padding: 0 14px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    border-radius: 0 !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    white-space: nowrap;

    background: linear-gradient(135deg, #4caf50, #388e3c) !important;
    border-color: #4caf50 !important;
    color: white !important;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
      filter: brightness(1.1);
    }

    &:active:not(:disabled) {
      transform: translateY(-1px);
      transition: all 0.1s ease;
    }

    &:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2) !important;
    }

    &:disabled {
      background: linear-gradient(135deg, #c0c4cc, #a0a4a8) !important;
      border-color: #c0c4cc !important;
      color: #ffffff !important;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .el-icon {
      margin-right: 6px;
      font-size: 15px;
    }

    .el-icon--right {
      margin-left: 4px;
      margin-right: 0;
    }
  }

  .export-status {
    white-space: nowrap;

    .el-text {
      font-size: 12px;
    }
  }
}

// 平板端适配
@media (max-width: 1024px) {
  .export-controls {
    .btn-export-data {
      min-width: 76px;
      padding: 0 10px !important;
      font-size: 12px !important;

      .el-icon {
        margin-right: 4px;
        font-size: 14px;
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .export-controls {
    height: 40px;

    .btn-export-data {
      height: 40px !important;
      min-width: 80px;
      max-width: 120px;
      padding: 0 10px !important;
      font-size: 12px !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;

      .el-icon {
        margin-right: 3px;
        font-size: 13px;
      }
    }

    .export-status .el-text {
      font-size: 11px;
    }
  }
}

// 超小屏幕适配
@media (max-width: 480px) {
  .export-controls {
    height: 36px;

    .btn-export-data {
      height: 36px !important;
      min-width: 70px;
      padding: 0 8px !important;
      font-size: 11px !important;

      .el-icon {
        margin-right: 2px;
        font-size: 12px;
      }
    }
  }
}

// 超宽屏幕优化
@media (min-width: 1440px) {
  .export-controls {
    .btn-export-data {
      min-width: 96px;
      padding: 0 16px !important;
      font-size: 14px !important;

      .el-icon {
        margin-right: 8px;
        font-size: 16px;
      }
    }
  }
}
</style>
