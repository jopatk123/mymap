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
import { Upload, Document, Tickets, Delete, InfoFilled, Check } from '@element-plus/icons-vue';
import { usePointUpload } from '@/composables/use-point-upload';

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

const {
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
} = usePointUpload({ props, emit });

// 暴露引用给父组件
defineExpose({
  uploadRef,
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
