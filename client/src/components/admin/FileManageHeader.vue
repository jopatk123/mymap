<template>
  <div class="page-header">
    <h2>文件管理</h2>
    <div class="header-actions">
      <el-button @click="openLegacyPointSystem" class="legacy-open-btn">
        打开选点系统
      </el-button>
      <el-button @click="openPointSystem" class="new-open-btn">
        打开点位展示系统
      </el-button>
      <el-button @click="$emit('upload-request', 'panorama')" type="primary">
        <el-icon><Plus /></el-icon>
        添加全景图
      </el-button>
      <el-button @click="$emit('upload-request', 'video')" type="success">
        <el-icon><VideoPlay /></el-icon>
        添加视频点位
      </el-button>
      <el-button @click="$emit('upload-request', 'kml')" type="warning">
        <el-icon><Document /></el-icon>
        添加KML文件
      </el-button>
      <!-- 新增KML底图按钮 -->
      <KMLBaseMapButton />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Plus, VideoPlay, Document } from '@element-plus/icons-vue'
import KMLBaseMapButton from './KMLBaseMapButton.vue'

defineEmits(['upload-request'])

const router = useRouter()
const openPointSystem = () => {
  const { href } = router.resolve({ name: 'Home' })
  window.open(href, '_blank')
}

const openLegacyPointSystem = () => {
  window.open('http://43.163.120.212/', '_blank')
}
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
    color: #303133;
  }
}

/* 新增按钮背景色样式 */
.header-actions {
  display: flex;
  gap: 8px;

  .legacy-open-btn {
    background-color: #909399; /* info 灰 */
    color: #fff;
    border-color: #909399;
  }

  .new-open-btn {
    background-color: #409EFF; /* primary 蓝 */
    color: #fff;
    border-color: #409EFF;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>