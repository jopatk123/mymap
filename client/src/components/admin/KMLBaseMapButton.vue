<template>
  <div class="kml-basemap-button">
    <!-- 添加KML底图按钮 -->
    <el-button type="info" :loading="uploading" @click="openUploadDialog">
      <el-icon><Document /></el-icon>
      添加KML底图
    </el-button>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="添加KML底图"
      width="500px"
      :close-on-click-modal="false"
      :append-to-body="true"
      custom-class="kml-basemap-dialog"
    >
      <div class="upload-content">
        <div class="upload-info">
          <el-alert title="KML底图说明" type="info" :closable="false" show-icon>
            <template #default>
              <p>• KML底图中的点位默认不显示在地图上</p>
              <p>• 可通过"圆形区域"和"自定义区域"功能选择性显示点位</p>
              <p>• 支持导出选中区域内的点位数据</p>
            </template>
          </el-alert>
        </div>

        <el-form :model="meta" label-width="80px">
          <el-form-item label="标题">
            <el-input v-model="meta.title" placeholder="文件标题（可选）" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="meta.description" placeholder="描述（可选）" />
          </el-form-item>
        </el-form>

        <div class="upload-area">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".kml"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            drag
          >
            <el-icon class="el-icon--upload">
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">将KML文件拖拽到此处，或<em>点击选择文件</em></div>
            <template #tip>
              <div class="el-upload__tip">只能上传 .kml 格式文件，且文件大小不超过 10MB</div>
            </template>
          </el-upload>
        </div>
        <!-- 文件信息 -->
        <div v-if="selectedFile" class="file-info">
          <el-card shadow="never">
            <div class="file-details">
              <div class="file-name">
                <el-icon><Document /></el-icon>
                <span>{{ selectedFile.name }}</span>
              </div>
              <div class="file-size">大小: {{ formatFileSize(selectedFile.size) }}</div>
            </div>
          </el-card>
        </div>

        <div class="basemap-option">
          <el-checkbox v-model="isBasemap">将此 KML 标记为底图（点位默认不显示）</el-checkbox>
        </div>

        <!-- 统计信息 -->
        <div v-if="(fileStatistics && fileStatistics.totalFiles) > 0" class="statistics">
          <el-descriptions title="当前统计" :column="2" size="small" border>
            <el-descriptions-item label="KML文件数">
              {{ (fileStatistics && fileStatistics.totalFiles) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="总点位数">
              {{ (fileStatistics && fileStatistics.totalPoints) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="可见点位">
              {{ (fileStatistics && fileStatistics.visiblePoints) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="区域数量">
              {{ (fileStatistics && fileStatistics.areasCount) || 0 }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="uploading" @click="closeUploadDialog"> 取消 </el-button>
          <el-button
            type="primary"
            :loading="uploading"
            :disabled="!selectedFile"
            @click="handleUpload"
          >
            上传文件
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, UploadFilled } from '@element-plus/icons-vue';
import { useKMLBaseMap } from '@/composables/use-kml-basemap.js';

const {
  uploadDialogVisible,
  uploading,
  fileStatistics,
  handleFileUpload,
  openUploadDialog,
  closeUploadDialog,
} = useKMLBaseMap();

// 本地状态
const uploadRef = ref();
const selectedFile = ref(null);
const isBasemap = ref(true);
const meta = ref({ title: '', description: '' });

// 处理文件选择
const handleFileChange = (file) => {
  selectedFile.value = file.raw;
};

// 处理文件数量超限
const handleExceed = () => {
  ElMessage.warning('只能选择一个KML文件');
};

// 执行上传
const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择KML文件');
    return;
  }

  try {
    await handleFileUpload(selectedFile.value, {
      isBasemap: isBasemap.value,
      title: meta.value.title,
      description: meta.value.description,
    });

    // 清理状态
    selectedFile.value = null;
    uploadRef.value?.clearFiles();
  } catch (error) {
    console.error('Upload error:', error);
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

// 监听对话框关闭，清理状态
const handleDialogClose = () => {
  selectedFile.value = null;
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// 监听对话框状态变化
watch(
  () => uploadDialogVisible.value,
  (visible) => {
    if (!visible) {
      handleDialogClose();
    }
  }
);

// 打开时提升 dialog 的 z-index，防止被其他组件遮挡
watch(
  () => uploadDialogVisible.value,
  (visible) => {
    if (!visible) return;
    // 在下一个 tick 找到 el-dialog__wrapper 并提升 z-index
    setTimeout(() => {
      try {
        const wrappers = Array.from(document.querySelectorAll('.kml-basemap-dialog'));
        wrappers.forEach((w) => {
          const wrapParent = w.closest('.el-dialog__wrapper') || w;
          if (wrapParent) {
            try {
              wrapParent.style.zIndex = '3000';
            } catch (e) {}
          }
        });
        // 也尝试提升弹窗遮罩层（.v-modal）
        const modals = Array.from(document.querySelectorAll('.v-modal'));
        modals.forEach((m) => {
          try {
            m.style.zIndex = '2999';
          } catch (e) {}
        });
      } catch (e) {
        // ignore
      }
    }, 0);
  }
);
</script>

<style lang="scss" scoped>
.kml-basemap-button {
  display: inline-block;
}

.upload-content {
  .upload-info {
    margin-bottom: 20px;

    :deep(.el-alert__content) {
      p {
        margin: 4px 0;
        line-height: 1.4;
      }
    }
  }

  .upload-area {
    margin-bottom: 20px;

    :deep(.el-upload-dragger) {
      width: 100%;
      height: 180px;
      border: 2px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s;

      &:hover {
        border-color: #409eff;
      }
    }

    .el-icon--upload {
      font-size: 67px;
      color: #c0c4cc;
      margin: 40px 0 16px;
      line-height: 50px;
    }
  }

  .file-info {
    margin-bottom: 20px;

    .file-details {
      .file-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        margin-bottom: 8px;

        .el-icon {
          color: #409eff;
        }
      }

      .file-size {
        color: #909399;
        font-size: 14px;
      }
    }
  }

  .statistics {
    :deep(.el-descriptions__title) {
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
