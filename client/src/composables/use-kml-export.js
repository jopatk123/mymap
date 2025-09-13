import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useKMLBaseMapStore } from '@/store/kml-basemap.js'
import { kmlExportService } from '@/services/kml-export-service.js'

// Module-level shared state so multiple components (toolbar, dialog, area-controls)
// operate on the same export state. This prevents the dialog being controlled by
// a different instance than the button that opened it.
const exporting = ref(false)
const exportDialogVisible = ref(false)
const exportFormat = ref('csv') // 'csv', 'kml', 'json'
const exportFilename = ref('')

console.debug('[use-kml-export] module loaded, shared export state created')
  
  // 初始化导出文件名
  const initializeFilename = () => {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
    exportFilename.value = `kml_points_${dateStr}_${timeStr}`
    console.debug('[use-kml-export] initializeFilename ->', exportFilename.value)
  }
  
  // 获取可导出的点位数据
  const getExportablePoints = computed(() => {
    const store = useKMLBaseMapStore()
    return store.visiblePoints
  })
  
  // 获取导出统计信息
  const getExportStatistics = computed(() => {
    const points = getExportablePoints.value
    return kmlExportService.getExportStatistics(points)
  })
  
  // 检查是否有可导出的数据
  const hasExportableData = computed(() => {
    return getExportablePoints.value.length > 0
  })
  
  // 打开导出对话框
  const openExportDialog = () => {
    console.debug('[use-kml-export] openExportDialog called; hasExportableData=', hasExportableData.value)
    if (!hasExportableData.value) {
      ElMessage.warning('没有可导出的点位数据，请先选择区域显示点位')
      return
    }

    initializeFilename()
    exportDialogVisible.value = true
    console.debug('[use-kml-export] exportDialogVisible set true')
  }
  
  // 关闭导出对话框
  const closeExportDialog = () => {
    exportDialogVisible.value = false
    console.debug('[use-kml-export] exportDialogVisible set false')
  }
  
  // 执行导出
  const performExport = async () => {
    console.debug('[use-kml-export] performExport called; format=', exportFormat.value, 'filename=', exportFilename.value)
    if (!hasExportableData.value) {
      ElMessage.error('没有可导出的数据')
      console.debug('[use-kml-export] performExport aborted: no exportable data')
      return
    }

    if (!exportFilename.value.trim()) {
      ElMessage.error('请输入文件名')
      console.debug('[use-kml-export] performExport aborted: empty filename')
      return
    }

    try {
      exporting.value = true
      const points = getExportablePoints.value
      const filename = exportFilename.value.trim()

      console.debug('[use-kml-export] about to call kmlExportService with points.length=', points.length)

      switch (exportFormat.value) {
        case 'csv':
          await kmlExportService.exportToCSV(points, filename)
          break

        case 'kml':
          await kmlExportService.exportToKML(
            points,
            filename,
            `区域筛选的KML点位数据 - ${new Date().toLocaleString()}`
          )
          break

        case 'json':
          await kmlExportService.exportToJSON(points, filename)
          break

        default:
          throw new Error('不支持的导出格式')
      }

      ElMessage.success(`数据导出成功！共导出 ${points.length} 个点位`)
      console.debug('[use-kml-export] export success')
      closeExportDialog()

    } catch (error) {
      ElMessage.error('导出失败: ' + error.message)
      console.error('Export error:', error)
    } finally {
      exporting.value = false
    }
  }
  
  // 快速导出（直接导出为CSV，不显示对话框）
  const quickExportCSV = async () => {
    console.debug('[use-kml-export] quickExportCSV called')
    if (!hasExportableData.value) {
      ElMessage.warning('没有可导出的点位数据，请先选择区域显示点位')
      return
    }

    try {
      exporting.value = true
      const points = getExportablePoints.value

      initializeFilename()
      console.debug('[use-kml-export] quickExportCSV -> filename=', exportFilename.value, 'points=', points.length)
      await kmlExportService.exportToCSV(points, exportFilename.value)

      ElMessage.success(`CSV文件导出成功！共导出 ${points.length} 个点位`)

    } catch (error) {
      ElMessage.error('导出失败: ' + error.message)
      console.error('Quick export error:', error)
    } finally {
      exporting.value = false
    }
  }
  
  // 快速导出KML
  const quickExportKML = async () => {
    console.debug('[use-kml-export] quickExportKML called')
    if (!hasExportableData.value) {
      ElMessage.warning('没有可导出的点位数据，请先选择区域显示点位')
      return
    }

    try {
      exporting.value = true
      const points = getExportablePoints.value

      initializeFilename()
      console.debug('[use-kml-export] quickExportKML -> filename=', exportFilename.value, 'points=', points.length)
      await kmlExportService.exportToKML(
        points,
        exportFilename.value,
        `区域筛选的KML点位数据 - ${new Date().toLocaleString()}`
      )

      ElMessage.success(`KML文件导出成功！共导出 ${points.length} 个点位`)

    } catch (error) {
      ElMessage.error('导出失败: ' + error.message)
      console.error('Quick export KML error:', error)
    } finally {
      exporting.value = false
    }
  }
  
  // 预览导出数据
  const previewExportData = () => {
    const points = getExportablePoints.value
    if (points.length === 0) {
      ElMessage.warning('没有可预览的数据')
      return
    }
    
    // 显示前5个点位的预览信息
    const preview = points.slice(0, 5).map((point, index) => ({
      序号: index + 1,
      名称: point.name || '未命名',
      描述: point.description || '无描述',
      纬度: point.latitude,
      经度: point.longitude,
      海拔: point.altitude || 0,
      来源文件: point.sourceFile || '未知'
    }))
    
  console.table(preview)
  console.debug('[use-kml-export] previewExportData -> preview rows=', preview.length)

  ElMessage.info(`数据预览已输出到控制台，共 ${points.length} 个点位`)
  }
  
  // 验证导出参数
  const validateExportParams = () => {
    if (!exportFilename.value.trim()) {
      return '请输入文件名'
    }
    
    if (!['csv', 'kml', 'json'].includes(exportFormat.value)) {
      return '请选择有效的导出格式'
    }
    
    if (!hasExportableData.value) {
      return '没有可导出的数据'
    }
    
    return null
  }
  
  // 获取格式说明
  const getFormatDescription = computed(() => {
    const descriptions = {
      csv: 'CSV格式，适合在Excel等软件中查看和编辑',
      kml: 'KML格式，可在Google Earth等地图软件中打开',
      json: 'JSON格式，适合程序处理和数据交换'
    }
    
    return descriptions[exportFormat.value] || ''
  })
  
export function useKMLExport() {
  return {
    // 状态
    exporting,
    exportDialogVisible,
    exportFormat,
    exportFilename,

    // 计算属性
    hasExportableData,
    getExportablePoints,
    getExportStatistics,
    getFormatDescription,

    // 方法
    openExportDialog,
    closeExportDialog,
    performExport,
    quickExportCSV,
    quickExportKML,
    previewExportData,
    validateExportParams
  }
}
