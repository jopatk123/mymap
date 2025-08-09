<template>
  <el-dialog
    v-model="visible"
    :title="`查看${file?.displayType || '文件'}`"
    width="800px"
    @close="handleClose"
  >
    <div v-if="file" class="file-detail">
      <!-- 文件基本信息 -->
      <div class="basic-info">
        <h3>基本信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题">{{ file.title }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getFileTypeColor(file.fileType)">
              {{ file.displayType }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ file.description || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="文件夹">
            {{ file.folder_name || '默认文件夹' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="file.is_visible ? 'success' : 'info'" size="small">
              {{ file.is_visible ? '显示' : '隐藏' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(file.created_at || file.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDate(file.updated_at || file.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 根据文件类型显示不同的详细信息 -->
      <div class="type-specific-info">
        <!-- 全景图信息 -->
        <div v-if="file.fileType === 'panorama'" class="panorama-info">
          <h3>全景图信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="坐标">
              {{ formatCoordinate(file.lat, file.lng) }}
            </el-descriptions-item>
            <el-descriptions-item label="文件大小">
              {{ formatFileSize(file.file_size) }}
            </el-descriptions-item>
          </el-descriptions>
          
          <div class="image-preview">
            <h4>预览图</h4>
            <img
              :src="file.thumbnailUrl || file.imageUrl"
              :alt="file.title"
              class="preview-image"
              @error="handleImageError"
            />
          </div>
        </div>

        <!-- 视频点位信息 -->
        <div v-else-if="file.fileType === 'video'" class="video-info">
          <h3>视频点位信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="坐标">
              {{ formatCoordinate(file.latitude, file.longitude) }}
            </el-descriptions-item>
            <el-descriptions-item label="文件大小">
              {{ formatFileSize(file.file_size) }}
            </el-descriptions-item>
            <el-descriptions-item label="时长">
              {{ formatDuration(file.duration) }}
            </el-descriptions-item>
            <el-descriptions-item label="文件类型">
              {{ file.file_type || '未知' }}
            </el-descriptions-item>
          </el-descriptions>
          
          <div class="video-preview">
            <h4>缩略图</h4>
            <img
              :src="file.thumbnailUrl"
              :alt="file.title"
              class="preview-image"
              @error="handleImageError"
            />
          </div>
        </div>

        <!-- KML文件信息 -->
        <div v-else-if="file.fileType === 'kml'" class="kml-info">
          <h3>KML文件信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="点位数量">
              {{ file.point_count || 0 }} 个
            </el-descriptions-item>
            <el-descriptions-item label="文件大小">
              {{ formatFileSize(file.file_size) }}
            </el-descriptions-item>
            <el-descriptions-item label="文件URL" :span="2">
              <el-link :href="file.file_url" target="_blank" type="primary">
                {{ file.file_url }}
              </el-link>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button @click="handleEdit" type="primary">编辑</el-button>
        <el-button @click="handleDelete" type="danger">删除</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'file-deleted', 'edit-file'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 获取文件类型颜色
const getFileTypeColor = (fileType) => {
  const colors = {
    panorama: 'primary',
    video: 'success', 
    kml: 'warning'
  }
  return colors[fileType] || 'info'
}

// 格式化坐标
const formatCoordinate = (lat, lng) => {
  if (!lat || !lng) return '未知位置'
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '未知大小'
  
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = parseInt(size)
  
  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }
  
  return `${fileSize.toFixed(1)} ${units[index]}`
}

// 格式化时长
const formatDuration = (duration) => {
  if (!duration) return '未知时长'
  
  const seconds = parseInt(duration)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = '/default-file.jpg'
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
}

// 编辑文件
const handleEdit = () => {
  emit('edit-file', props.file)
  handleClose()
}

// 删除文件
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除${props.file?.displayType}"${props.file?.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    emit('file-deleted', props.file)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}
</script>

<style lang="scss" scoped>
.file-detail {
  .basic-info,
  .type-specific-info {
    margin-bottom: 24px;
    
    h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
    
    h4 {
      margin: 16px 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: #606266;
    }
  }
  
  .image-preview,
  .video-preview {
    margin-top: 16px;
    
    .preview-image {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      border: 1px solid #eee;
      object-fit: contain;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>