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

      <el-dropdown trigger="click" @command="handleToolbarPointCommand">
        <template #default>
            <el-button type="info" class="btn-point-settings">
            <el-icon><Location /></el-icon>
            点位设置
            <el-icon style="margin-left:6px"><ArrowDown /></el-icon>
          </el-button>
        </template>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="kml"><el-icon><Tools /></el-icon> KML设置</el-dropdown-item>
            <el-dropdown-item command="point"><el-icon><Location /></el-icon> 点位图标设置</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-button-group>
  </div>
</template>

<script setup>
import { Plus, View, Hide, Tools, Location, ArrowDown } from '@element-plus/icons-vue';

const emit = defineEmits([
  'toggle-panorama-list',
  'show-upload',
  'show-kml-settings',
  'show-point-settings',
]);

function handleToolbarPointCommand(command) {
  if (command === 'kml') emit('show-kml-settings');
  else if (command === 'point') emit('show-point-settings');
}

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

// emits defined above
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

/* 点位设置（淡蓝色） */
.btn-point-settings {
  background: linear-gradient(135deg, #1976d2, #1565c0) !important; /* 深蓝渐变 */
  border-color: #1565c0 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.18);
  border-radius: 0 !important;
}

/* 确保下拉包装器内的按钮没有圆角 */
.toolbar ::v-deep .el-dropdown .el-button {
  border-radius: 0 !important;
}
</style>
