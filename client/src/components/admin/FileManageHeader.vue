<template>
  <div class="page-header">
    <h2>文件管理</h2>
    <div class="header-actions">
      <el-button class="new-open-btn" @click="openPointSystem"> 打开点位展示系统 </el-button>
      <el-button type="primary" @click="$emit('upload-request', 'panorama')">
        <el-icon><Plus /></el-icon>
        添加全景图
      </el-button>
      <el-button type="success" @click="$emit('upload-request', 'video')">
        <el-icon><VideoPlay /></el-icon>
        添加视频点位
      </el-button>
      <el-button type="warning" @click="$emit('upload-request', 'kml')">
        <el-icon><Document /></el-icon>
        添加点位
      </el-button>
      <!-- 新增KML底图按钮 -->
      <KMLBaseMapButton />

      <!-- 初始显示设置按钮 -->
      <el-button type="info" @click="showInitialViewDialog = true">
        <el-icon><Location /></el-icon>
        初始显示设置
      </el-button>

      <!-- KML样式配置入口 -->
      <el-dropdown @command="handleStyleConfigCommand">
        <el-button type="info">
          <el-icon><Setting /></el-icon>
          KML样式配置
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="normal">普通KML文件设置</el-dropdown-item>
            <el-dropdown-item command="basemap">底图KML文件设置</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 初始显示设置对话框 -->
    <InitialViewSettingsDialog
      v-model="showInitialViewDialog"
      @settings-updated="handleInitialViewSettingsUpdated"
    />

    <!-- KML样式配置对话框 -->
    <KmlStyleDialog
      v-model="styleDialogVisible"
      :basemap-mode="styleDialogBasemapMode"
      @styles-updated="handleStylesUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { Plus, VideoPlay, Document, Setting, ArrowDown, Location } from '@element-plus/icons-vue';
import KMLBaseMapButton from './KMLBaseMapButton.vue';
import KmlStyleDialog from '../map/KmlStyleDialog.vue';
import InitialViewSettingsDialog from './InitialViewSettingsDialog.vue';

defineEmits(['upload-request']);

const router = useRouter();

// 初始显示设置状态
const showInitialViewDialog = ref(false);

// KML样式配置状态
const styleDialogVisible = ref(false);
const styleDialogBasemapMode = ref(false);

// 处理样式配置命令
const handleStyleConfigCommand = (command) => {
  styleDialogBasemapMode.value = command === 'basemap';
  styleDialogVisible.value = true;
};

// 监听全局事件以便从其他组件快捷打开 KML 样式设置
const handleShowKmlSettings = (event) => {
  const detail = (event && event.detail) || {};
  styleDialogBasemapMode.value = !!detail.basemap;
  styleDialogVisible.value = true;
};

onMounted(() => {
  window.addEventListener('show-kml-settings', handleShowKmlSettings);
});

onUnmounted(() => {
  window.removeEventListener('show-kml-settings', handleShowKmlSettings);
});

// 初始显示设置更新处理
const handleInitialViewSettingsUpdated = () => {
  // 设置更新后的处理逻辑（如果需要）
  // 使用 ElMessage 代替 console.log 以符合 no-console 策略
  ElMessage && ElMessage.success && ElMessage.success('初始显示设置已更新');
};

// 样式更新处理
const handleStylesUpdated = () => {
  // 简单通知地图刷新
};

const openPointSystem = () => {
  const { href } = router.resolve({ name: 'Home' });
  window.open(href, '_blank');
};

// legacy point system removed: openLegacyPointSystem intentionally deleted
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

  .new-open-btn {
    background-color: #409eff; /* primary 蓝 */
    color: #fff;
    border-color: #409eff;
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
