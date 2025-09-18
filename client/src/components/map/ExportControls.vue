<template>
  <div class="export-controls">
    <!-- 导出按钮和格式选择 -->
    <el-dropdown 
      :disabled="!hasExportableData" 
      @command="handleExport"
      placement="bottom-start"
      trigger="click"
    >
      <el-button 
        class="btn-export-data" 
        :disabled="!hasExportableData"
        :loading="exporting"
      >
        <el-icon><Download /></el-icon>
        导出数据
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
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

    <!-- 数据统计显示 -->
    <div v-if="visibleCount > 0" class="export-status">
      <el-text type="info" size="small">
        可导出 {{ visibleCount }} 个KML点位
      </el-text>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, ArrowDown, DocumentCopy, Grid } from '@element-plus/icons-vue';
import { kmlPointsExportService } from '@/services/panorama-export-service.js';

const props = defineProps({
  // 当前可见的KML点位数据
  visibleKMLPoints: {
    type: Array,
    default: () => []
  }
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
  handleExport
});
</script>

<style scoped lang="scss">
.export-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  .btn-export-data {
    background: linear-gradient(135deg, #67c23a, #5cb85c);
    border-color: #67c23a;
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #5cb85c, #449d44);
      border-color: #5cb85c;
    }
    
    &:disabled {
      background: #c0c4cc;
      border-color: #c0c4cc;
      color: #ffffff;
      cursor: not-allowed;
    }
  }

  .export-status {
    white-space: nowrap;
    
    .el-text {
      font-size: 12px;
    }
  }
}

// 适配移动端
@media (max-width: 768px) {
  .export-controls {
    .btn-export-data {
      font-size: 12px;
      padding: 6px 12px;
    }
    
    .export-status .el-text {
      font-size: 11px;
    }
  }
}
</style>