<template>
  <div class="tree-node">
    <div class="node-content">
      <el-icon class="folder-icon">
        <Folder v-if="data.is_visible" />
        <FolderOpened v-else />
      </el-icon>
      <span class="node-label" :class="{ hidden: !data.is_visible }">
        {{ data.name }}
      </span>
      <span class="panorama-count">
        ({{ (data.panoramaCount || 0) + (data.videoPointCount || 0) + (data.kmlFileCount || 0) + (data.imageSetCount || 0) }})
      </span>
    </div>

    <div class="node-actions">
      <el-button
        :type="data.is_visible ? 'info' : 'warning'"
        size="small"
        text
        @click.stop="$emit('toggle-visibility')"
      >
        <el-icon>
          <View v-if="data.is_visible" />
          <Hide v-else />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Folder, FolderOpened, View, Hide } from '@element-plus/icons-vue';

defineProps({
  data: {
    type: Object,
    required: true,
  },
});

defineEmits(['toggle-visibility']);
</script>

<style lang="scss" scoped>
.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .node-content {
    display: flex;
    align-items: center;
    flex: 1;

    .folder-icon {
      margin-right: 8px;
      color: #409eff;
    }

    .node-label {
      margin-right: 8px;

      &.hidden {
        color: #999;
        text-decoration: line-through;
      }
    }

    .panorama-count {
      color: #999;
      font-size: 12px;
    }
  }

  .node-actions {
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .node-actions {
    opacity: 1;
  }
}
</style>
