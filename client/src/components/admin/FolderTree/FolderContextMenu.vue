<template>
  <div
    class="context-menu"
    :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    @click.stop
  >
    <div class="menu-item" @click="handleCreateSubFolder">
      <el-icon><FolderAdd /></el-icon>
      新建子文件夹
    </div>
    <div class="menu-item" @click="handleEditFolder">
      <el-icon><Edit /></el-icon>
      编辑文件夹
    </div>
    <div class="menu-item" @click="handleToggleVisibility">
      <el-icon>
        <View v-if="contextMenu.node.is_visible" />
        <Hide v-else />
      </el-icon>
      {{ contextMenu.node.is_visible ? '隐藏' : '显示' }}
    </div>
    <div class="menu-divider"></div>
    <el-tooltip
      :disabled="canDelete"
      content="系统要求至少保留一个文件夹"
      placement="right"
    >
      <div 
        class="menu-item danger" 
        :class="{ disabled: !canDelete }"
        @click="handleDeleteFolder"
      >
        <el-icon><Delete /></el-icon>
        删除文件夹
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { FolderAdd, Edit, Delete, View, Hide } from '@element-plus/icons-vue';

const props = defineProps({
  contextMenu: {
    type: Object,
    required: true,
  },
  canDelete: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  'create-sub-folder',
  'edit-folder',
  'toggle-visibility',
  'delete-folder',
  'hide',
]);

const handleCreateSubFolder = () => {
  emit('create-sub-folder');
  emit('hide');
};

const handleEditFolder = () => {
  emit('edit-folder');
  emit('hide');
};

const handleToggleVisibility = () => {
  emit('toggle-visibility');
  emit('hide');
};

const handleDeleteFolder = () => {
  if (!props.canDelete) {
    return;
  }
  emit('delete-folder');
  emit('hide');
};
</script>

<style lang="scss" scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  min-width: 120px;

  .menu-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      background: #f5f7fa;
    }

    &.danger {
      color: #f56c6c;

      &:hover {
        background: #fef0f0;
      }
    }

    &.disabled {
      color: #c0c4cc;
      cursor: not-allowed;

      &:hover {
        background: transparent;
      }
    }

    .el-icon {
      margin-right: 8px;
    }
  }

  .menu-divider {
    height: 1px;
    background: #eee;
    margin: 4px 0;
  }
}
</style>
