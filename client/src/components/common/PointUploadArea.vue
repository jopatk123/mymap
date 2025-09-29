<template>
  <div class="point-upload-area">
    <!-- 文件类型选择 -->
    <el-form-item label="文件类型">
      <el-radio-group v-model="selectedFileType" @change="handleFileTypeChange">
        <el-radio-button label="kml">KML文件</el-radio-button>
        <el-radio-button label="excel">Excel文件</el-radio-button>
      </el-radio-group>
    </el-form-item>

    <!-- 格式说明 -->
    <el-form-item label="格式说明">
      <div class="format-info">
        <div v-if="selectedFileType === 'kml'" class="format-description">
          <el-icon><InfoFilled /></el-icon>
          <span>支持标准KML格式文件，系统会自动解析其中的点位信息</span>
        </div>
        <div v-else class="format-description">
          <el-icon><InfoFilled /></el-icon>
          <div>
            <p>Excel文件必须包含以下列:</p>
            <ul>
              <li><strong>必需列:</strong> 点位名称、经度、纬度</li>
              <li><strong>可选列:</strong> 备注（作为描述信息）</li>
            </ul>
            <p class="note">支持的列名变体见下方提示</p>
          </div>
        </div>
      </div>
    </el-form-item>

    <!-- Excel列名提示 -->
    <el-form-item v-if="selectedFileType === 'excel'" label="支持的列名">
      <div class="column-hints">
        <div class="column-group">
          <strong>点位名称:</strong> {{ COLUMN_HINTS.name.join('、') }}
        </div>
        <div class="column-group">
          <strong>经度:</strong> {{ COLUMN_HINTS.longitude.join('、') }}
        </div>
        <div class="column-group">
          <strong>纬度:</strong> {{ COLUMN_HINTS.latitude.join('、') }}
        </div>
        <div class="column-group">
          <strong>备注(可选):</strong> {{ COLUMN_HINTS.description.join('、') }}
        </div>
      </div>
    </el-form-item>

    <!-- 文件上传区域 -->
    <el-form-item label="选择文件" required>
      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :show-file-list="false"
        :auto-upload="false"
        :before-upload="handleBeforeUpload"
        :on-change="handleFileChange"
        :accept="acceptedFileTypes"
        :disabled="uploading"
      >
        <div v-if="!currentFile" class="upload-placeholder">
          <el-icon class="upload-icon"><Upload /></el-icon>
          <div class="upload-text">
            <p>将{{ fileTypeText }}拖拽到此处，或<em>点击上传</em></p>
            <p class="upload-hint">{{ acceptHint }}</p>
          </div>
        </div>
        <div v-else class="file-info">
          <div class="file-details">
            <el-icon class="file-icon">
              <Document v-if="selectedFileType === 'kml'" />
              <Tickets v-else />
            </el-icon>
            <div class="file-meta">
              <div class="file-name">{{ currentFile.name }}</div>
              <div class="file-size">{{ formatFileSize(currentFile.size) }}</div>
            </div>
          </div>
          <el-button type="danger" size="small" @click="removeFile">
            <el-icon><Delete /></el-icon>
            移除
          </el-button>
        </div>
      </el-upload>
    </el-form-item>

    <!-- 验证状态和结果 -->
    <div v-if="validationState" class="validation-section">
      <!-- 验证失败 -->
      <el-form-item v-if="!validationState.valid" label="验证结果">
        <el-alert type="error" :closable="false" show-icon>
          <template #title>文件验证失败</template>
          <div class="error-content">{{ validationState.error }}</div>
        </el-alert>
      </el-form-item>

      <!-- 验证成功 -->
      <div v-else>
        <!-- 统计信息 -->
        <el-form-item label="解析结果">
          <div class="parse-stats">
            <el-tag type="success" size="large">
              <el-icon><Check /></el-icon>
              成功解析
              {{ validationState.pointCount || validationState.placemarkCount || 0 }} 个点位
            </el-tag>
            <span v-if="validationState.errors && validationState.errors.length > 0">
              <el-tag type="warning" size="large">
                {{ validationState.errors.length }} 个数据问题已跳过
              </el-tag>
            </span>
          </div>
        </el-form-item>

        <!-- Excel错误信息 -->
        <el-form-item
          v-if="validationState.errors && validationState.errors.length > 0"
          label="数据问题"
        >
          <el-alert type="warning" :closable="false">
            <template #title>以下数据行存在问题已跳过：</template>
            <ul class="error-list">
              <li v-for="(error, index) in validationState.errors.slice(0, 5)" :key="index">
                {{ error }}
              </li>
              <li v-if="validationState.errors.length > 5">
                ...还有 {{ validationState.errors.length - 5 }} 个问题
              </li>
            </ul>
          </el-alert>
        </el-form-item>

        <!-- 点位预览 -->
        <el-form-item label="点位预览">
          <div class="points-preview">
            <div class="preview-header">
              <span
                >前
                {{
                  Math.min(
                    5,
                    (validationState.previewPoints || validationState.placemarks || []).length
                  )
                }}
                个点位：</span
              >
            </div>
            <div class="point-list">
              <div
                v-for="(point, index) in (
                  validationState.previewPoints ||
                  validationState.placemarks ||
                  []
                ).slice(0, 5)"
                :key="index"
                class="point-item"
              >
                <div class="point-name">{{ point.name || '未命名点位' }}</div>
                <div class="point-info">
                  <span class="point-coords">
                    {{ point.latitude?.toFixed(4) }}, {{ point.longitude?.toFixed(4) }}
                  </span>
                  <span v-if="point.description" class="point-desc">{{ point.description }}</span>
                  <el-button type="text" size="small" @click="copyPointCoords(point)">
                    复制经纬度
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-form-item>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, Document, Tickets, Delete, InfoFilled, Check } from '@element-plus/icons-vue';
import { useKmlProcessor } from '@/composables/use-file-processor';
import { useExcelProcessor } from '@/composables/use-excel-processor';

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  validationResult: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'update:validationResult',
  'file-change',
  'file-remove',
]);

// 文件类型和处理器
const selectedFileType = ref('kml');
const currentFile = ref(null);
const uploading = ref(false);

// 处理器实例
const kmlProcessor = useKmlProcessor();
const excelProcessor = useExcelProcessor();

// 列名提示
const COLUMN_HINTS = {
  name: ['点位名称', '名称', '标题', 'name', 'title'],
  longitude: ['经度', 'lng', 'lon', 'longitude', 'x'],
  latitude: ['纬度', 'lat', 'latitude', 'y'],
  description: ['备注', '描述', '说明', 'description', 'note'],
};

// 计算属性
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

// 监听验证结果变化
watch(rawValidationResult, (newVal) => {
  emit('update:validationResult', newVal);
});

// 文件类型切换
const handleFileTypeChange = () => {
  // 清除当前文件和验证结果
  removeFile();
};

// 文件上传前验证
const handleBeforeUpload = (file) => {
  const processor = selectedFileType.value === 'kml' ? kmlProcessor : excelProcessor;
  return processor.validateFile(file);
};

// 文件选择处理
const handleFileChange = async (uploadFile) => {
  // Element Plus el-upload 的 on-change 事件传递的是 UploadFile 对象
  // 需要从中提取原始 File 对象
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

// 移除文件
const removeFile = () => {
  currentFile.value = null;
  kmlProcessor.validationResult.value = null;
  excelProcessor.validationResult.value = null;
  excelProcessor.previewData.value = [];

  emit('update:modelValue', null);
  emit('file-remove');
};

// 复制坐标
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

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 暴露引用给父组件
defineExpose({
  uploadRef: ref(null),
});
</script>

<style scoped>
.point-upload-area {
  .format-info {
    .format-description {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #909399;
      font-size: 14px;

      .el-icon {
        font-size: 16px;
        margin-top: 2px;
        flex-shrink: 0;
      }

      ul {
        margin: 4px 0;
        padding-left: 16px;
      }

      .note {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .column-hints {
    background-color: #f5f7fa;
    padding: 12px;
    border-radius: 4px;
    font-size: 13px;

    .column-group {
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #303133;
        margin-right: 8px;
      }
    }
  }

  .upload-area {
    width: 100%;

    :deep(.el-upload) {
      width: 100%;
    }

    :deep(.el-upload-dragger) {
      width: 100%;
      height: auto;
      padding: 20px;
    }

    .upload-placeholder {
      text-align: center;

      .upload-icon {
        font-size: 48px;
        color: #c0c4cc;
        margin-bottom: 16px;
      }

      .upload-text {
        p {
          margin: 8px 0;
        }

        .upload-hint {
          font-size: 12px;
          color: #999;
        }
      }
    }

    .file-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;

      .file-details {
        display: flex;
        align-items: center;
        gap: 12px;

        .file-icon {
          font-size: 24px;
          color: #409eff;
        }

        .file-meta {
          .file-name {
            font-weight: 500;
            color: #303133;
          }

          .file-size {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }
  }

  .validation-section {
    .error-content {
      white-space: pre-line;
      font-size: 13px;
    }

    .parse-stats {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .error-list {
      margin: 8px 0;
      padding-left: 16px;
      font-size: 13px;
    }

    .points-preview {
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      padding: 12px;
      background-color: #fafafa;

      .preview-header {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        margin-bottom: 8px;
      }

      .point-list {
        .point-item {
          padding: 8px 0;
          border-bottom: 1px solid #ebeef5;

          &:last-child {
            border-bottom: none;
          }

          .point-name {
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
          }

          .point-info {
            display: flex;
            gap: 12px;
            align-items: center;
            font-size: 12px;
            color: #909399;

            .point-coords {
              background-color: #e4e7ed;
              padding: 2px 6px;
              border-radius: 2px;
            }

            .point-desc {
              color: #606266;
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }
    }
  }
}
</style>
