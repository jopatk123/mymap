<template>
  <div class="page-header">
    <h2>文件管理</h2>
    <div class="header-actions">
      <el-button class="new-open-btn" @click="openPointSystem"> 打开点位展示系统 </el-button>
      <!-- 合并入口：添加点位 下拉菜单（包含 全景/视频/图层/KML底图） -->
      <el-dropdown @command="handleAddPointCommand">
        <el-button type="primary">
          <el-icon><Plus /></el-icon>
          添加点位
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="panorama">添加全景图</el-dropdown-item>
            <el-dropdown-item command="video">添加视频点位</el-dropdown-item>
            <el-dropdown-item command="image-set">添加图片集</el-dropdown-item>
            <el-dropdown-item command="kml">添加图层点位</el-dropdown-item>
            <el-dropdown-item command="kml-basemap">添加KML底图</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!-- 隐藏触发器的 KMLBaseMapButton 作为 dialog 的宿主，父组件可通过 ref 调用其 openUploadDialog -->
      <KMLBaseMapButton ref="kmlBaseMapRef" :hide-trigger="true" />

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
import { Plus, Setting, ArrowDown, Location } from '@element-plus/icons-vue';
import KMLBaseMapButton from './KMLBaseMapButton.vue';
import KmlStyleDialog from '../map/KmlStyleDialog.vue';
import InitialViewSettingsDialog from './InitialViewSettingsDialog.vue';

const emit = defineEmits(['upload-request']);

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

// ref to KMLBaseMapButton 子组件（用于打开 KML 底图上传对话框）
import { ref as vueRef } from 'vue';
const kmlBaseMapRef = vueRef(null);

// 处理添加点位下拉的命令
const handleAddPointCommand = (command) => {
  if (command === 'kml-basemap') {
    // 调用子组件暴露的方法打开上传对话框
    if (kmlBaseMapRef.value && typeof kmlBaseMapRef.value.openUploadDialog === 'function') {
      kmlBaseMapRef.value.openUploadDialog();
    } else {
      // 回退：触发事件以便其他监听者打开对话框
      window.dispatchEvent(new CustomEvent('open-kml-basemap'));
    }
    return;
  }

  // 其他类型仍然沿用原有 emit
  emit('upload-request', command);
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
  flex-wrap: wrap;

  .new-open-btn {
    background-color: #409eff; /* primary 蓝 */
    color: #fff;
    border-color: #409eff;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    h2 {
      font-size: 18px;
      text-align: center;
    }
  }

  .header-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    .el-button,
    .el-dropdown {
      width: 100%;
    }

    .el-dropdown .el-button {
      width: 100%;
    }

    .new-open-btn {
      grid-column: span 2;
    }
  }
}

@media (max-width: 480px) {
  .header-actions {
    grid-template-columns: 1fr;

    .new-open-btn {
      grid-column: span 1;
    }
  }
}
</style>
