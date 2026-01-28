import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useKmlProcessor } from '@/composables/use-file-processor';
import { useExcelProcessor } from '@/composables/use-excel-processor';

const COLUMN_HINTS = {
  name: ['点位名称', '名称', '标题', 'name', 'title'],
  longitude: ['经度', 'lng', 'lon', 'longitude', 'x'],
  latitude: ['纬度', 'lat', 'latitude', 'y'],
  description: ['备注', '描述', '说明', 'description', 'note'],
};

export function usePointUpload({ props, emit }) {
  const selectedFileType = ref('kml');
  const currentFile = ref(null);
  const uploading = ref(false);
  const uploadRef = ref(null);

  const kmlProcessor = useKmlProcessor();
  const excelProcessor = useExcelProcessor();

  const rawValidationResult = computed(() => {
    return selectedFileType.value === 'kml'
      ? kmlProcessor.validationResult.value
      : excelProcessor.validationResult.value;
  });

  const validationState = computed(() => props.validationResult ?? rawValidationResult.value);

  const fileTypeText = computed(() => {
    return selectedFileType.value === 'kml' ? 'KML文件' : 'Excel文件';
  });

  const acceptedFileTypes = computed(() => {
    return selectedFileType.value === 'kml' ? '.kml,.kmz' : '.xlsx,.xls,.csv';
  });

  const acceptHint = computed(() => {
    return selectedFileType.value === 'kml'
      ? '支持 .kml, .kmz 格式'
      : '支持 .xlsx, .xls, .csv 格式，大小不超过10MB';
  });

  watch(rawValidationResult, (newVal) => {
    emit('update:validationResult', newVal);
  });

  const handleFileTypeChange = () => {
    removeFile();
  };

  const handleBeforeUpload = (file) => {
    const processor = selectedFileType.value === 'kml' ? kmlProcessor : excelProcessor;
    return processor.validateFile(file);
  };

  const handleFileChange = async (uploadFile) => {
    const file = uploadFile.raw;
    if (!file) return;

    try {
      uploading.value = true;
      currentFile.value = file;

      const processor = selectedFileType.value === 'kml' ? kmlProcessor : excelProcessor;
      await processor.processFile(file);

      emit('update:modelValue', file);
      emit('file-change', file);
    } catch (error) {
      ElMessage.error('文件处理失败: ' + (error?.message || error));
      removeFile();
    } finally {
      uploading.value = false;
    }
  };

  const removeFile = () => {
    currentFile.value = null;
    kmlProcessor.validationResult.value = null;
    excelProcessor.validationResult.value = null;
    excelProcessor.previewData.value = [];

    emit('update:modelValue', null);
    emit('file-remove');
  };

  const copyPointCoords = async (point) => {
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
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
      void console.error('复制失败', e);
      ElMessage.error('复制失败，请手动复制：' + formatted);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    COLUMN_HINTS,
    selectedFileType,
    currentFile,
    uploading,
    uploadRef,
    validationState,
    fileTypeText,
    acceptedFileTypes,
    acceptHint,
    handleFileTypeChange,
    handleBeforeUpload,
    handleFileChange,
    removeFile,
    copyPointCoords,
    formatFileSize,
  };
}
