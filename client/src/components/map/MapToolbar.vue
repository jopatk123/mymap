<template>
  <div class="toolbar">
    <el-button-group>
      <el-button
        type="primary"
        :icon="panoramaListVisible ? Hide : View"
        :title="panoramaListVisible ? '隐藏全景图列表' : '显示全景图列表'"
        @click="$emit('toggle-panorama-list')"
      >
        {{ panoramaListVisible ? '隐藏列表' : '显示列表' }}
      </el-button>
      <el-button type="success" @click="$emit('show-upload')">
        <el-icon><Plus /></el-icon>
        添加
      </el-button>

      <el-button type="warning" @click="$emit('show-kml-settings')">
        <el-icon><Tools /></el-icon>
        KML设置
      </el-button>
      <el-button type="info" @click="$emit('show-point-settings')">
        <el-icon><Location /></el-icon>
        点位图标
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup>
import { Plus, View, Hide, Tools, Location } from '@element-plus/icons-vue';

defineProps({
  panoramaListVisible: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['toggle-panorama-list', 'show-upload', 'show-kml-settings', 'show-point-settings']);
</script>

<style lang="scss" scoped>
.toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

// 移动端适配
@media (max-width: 768px) {
  .toolbar {
    top: 10px;
    right: 10px;

    .el-button-group {
      flex-direction: column;

      .el-button {
        margin: 0 0 4px 0;
      }
    }
  }
}

/* 与 MapControls 统一：固定字号、紧凑内边距、宽度自适应 */
.toolbar ::v-deep .el-button {
  font-size: 12px !important;
  padding: 0 8px !important;
  height: 36px !important;
  line-height: 36px !important;
  min-width: 0 !important;
  width: auto !important;
}
</style>
