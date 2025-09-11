<template>
  <el-dialog
    v-model="exportDialogVisible"
    title="导出KML点位数据"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="export-content">
      <!-- 导出统计信息 -->
      <div class="export-stats">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>导出数据统计</span>
            </div>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总点位数" :value="exportStatistics.totalCount" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="有名称" :value="exportStatistics.hasName" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="有描述" :value="exportStatistics.hasDescription" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="有海拔" :value="exportStatistics.hasAltitude" />
            </el-col>
          </el-row>
        </el-card>
      </div>

      <!-- 导出设置 -->
      <div class="export-settings">
        <el-form :model="exportForm" label-width="100px">
          <el-form-item label="文件名" required>
            <el-input
              v-model="exportFilename"
              placeholder="请输入导出文件名"
              style="width: 300px"
            >
              <template #suffix>
                .{{ exportFormat }}
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="导出格式" required>
            <el-radio-group v-model="exportFormat">
              <el-radio label="csv">
                <div class="format-option">
                  <strong>CSV格式</strong>
                  <div class="format-desc">Excel兼容格式，适合数据分析</div>
                </div>
              </el-radio>
              <el-radio label="kml">
                <div class="format-option">
                  <strong>KML格式</strong>
                  <div class="format-desc">Google Earth兼容格式</div>
                </div>
              </el-radio>
              <el-radio label="json">
                <div class="format-option">
                  <strong>JSON格式</strong>
                  <div class="format-desc">程序友好格式，便于数据处理</div>
                </div>
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 格式说明 -->
      <div class="format-description">
        <el-alert
          :title="formatDescription"
          type="info"
          :closable="false"
          show-icon
        />
      </div>

      <!-- 数据预览 -->
      <div class="data-preview">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>数据预览 (前5条)</span>
              <el-button size="small" text @click="handlePreview">
                查看完整预览
              </el-button>
            </div>
          </template>
          
          <el-table
            :data="previewData"
            size="small"
            style="width: 100%"
            max-height="200"
          >
            <el-table-column prop="name" label="名称" width="150" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" width="120" show-overflow-tooltip />
            <el-table-column prop="latitude" label="纬度" width="100" />
            <el-table-column prop="longitude" label="经度" width="100" />
            <el-table-column prop="sourceFile" label="来源文件" show-overflow-tooltip />
          </el-table>
        </el-card>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <el-divider>快速操作</el-divider>
        <div class="quick-buttons">
          <el-button
            @click="handleQuickExportCSV"
            type="success"
            :loading="exporting"
            :disabled="!hasExportableData"
          >
            <el-icon><Download /></el-icon>
            快速导出CSV
          </el-button>
          <el-button
            @click="handleQuickExportKML"
            type="warning"
            :loading="exporting"
            :disabled="!hasExportableData"
          >
            <el-icon><Download /></el-icon>
            快速导出KML
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeExportDialog" :disabled="exporting">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleExport"
          :loading="exporting"
          :disabled="!canExport"
        >
          导出文件
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { useKMLExport } from '@/composables/use-kml-export.js'

const {
  exporting,
  exportDialogVisible,
  exportFormat,
  exportFilename,
  hasExportableData,
  getExportablePoints,
  getExportStatistics,
  getFormatDescription,
  closeExportDialog,
  performExport,
  quickExportCSV,
  quickExportKML,
  previewExportData,
  validateExportParams
} = useKMLExport()

// 表单数据
const exportForm = reactive({
  filename: exportFilename,
  format: exportFormat
})

// 计算属性
const exportStatistics = computed(() => getExportStatistics.value)
const formatDescription = computed(() => getFormatDescription.value)
const canExport = computed(() => {
  return hasExportableData.value && 
         exportFilename.value.trim() && 
         exportFormat.value
})

// 预览数据（前5条）
const previewData = computed(() => {
  const points = getExportablePoints.value
  return points.slice(0, 5).map(point => ({
    name: point.name || '未命名',
    description: point.description || '无描述',
    latitude: point.latitude?.toFixed(6) || '',
    longitude: point.longitude?.toFixed(6) || '',
    sourceFile: point.sourceFile || '未知'
  }))
})

// 处理导出
const handleExport = async () => {
  const error = validateExportParams()
  if (error) {
    ElMessage.error(error)
    return
  }
  
  await performExport()
}

// 处理预览
const handlePreview = () => {
  previewExportData()
}

// 快速导出CSV
const handleQuickExportCSV = async () => {
  await quickExportCSV()
}

// 快速导出KML
const handleQuickExportKML = async () => {
  await quickExportKML()
}
</script>

<style lang="scss" scoped>
.export-content {
  .export-stats {
    margin-bottom: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .export-settings {
    margin-bottom: 20px;
    
    .format-option {
      margin-left: 8px;
      
      .format-desc {
        font-size: 12px;
        color: #909399;
        margin-top: 2px;
      }
    }
    
    :deep(.el-radio) {
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
    }
    
    :deep(.el-radio__input) {
      margin-top: 2px;
    }
  }

  .format-description {
    margin-bottom: 20px;
  }

  .data-preview {
    margin-bottom: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .quick-actions {
    .quick-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
