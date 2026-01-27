<template>
  <div class="folder-tree">
    <div class="tree-header">
      <h3>文件夹管理</h3>
      <el-button type="primary" size="small" @click="$emit('create-folder')">
        <el-icon><FolderAdd /></el-icon>
        新建文件夹
      </el-button>
    </div>

    <div class="tree-content">
      <!-- KML底图文件夹 -->
      <div class="kml-basemap-section">
        <KMLBaseMapFolder />
      </div>

      <el-tree
        ref="treeRef"
        :data="folderTree"
        :props="treeProps"
        node-key="id"
        :expand-on-click-node="false"
        :default-expand-all="true"
        @node-contextmenu="handleNodeRightClick"
        @node-click="handleNodeClick"
      >
        <template #default="{ data }">
          <FolderTreeNode :data="data" @toggle-visibility="$emit('toggle-visibility', data)" />
        </template>
      </el-tree>
    </div>

    <FolderContextMenu
      v-if="contextMenu.visible"
      :context-menu="contextMenu"
      :can-delete="canDelete"
      @create-sub-folder="$emit('create-sub-folder', contextMenu.node)"
      @edit-folder="$emit('edit-folder', contextMenu.node)"
      @toggle-visibility="$emit('toggle-visibility', contextMenu.node)"
      @delete-folder="$emit('delete-folder', contextMenu.node)"
      @hide="hideContextMenu"
    />
  </div>
</template>

<script setup>
import { reactive, onMounted, onUnmounted } from 'vue';
import { FolderAdd } from '@element-plus/icons-vue';
import FolderTreeNode from './FolderTreeNode.vue';
import FolderContextMenu from './FolderContextMenu.vue';
import KMLBaseMapFolder from '@/components/map/kml-basemap/KMLBaseMapFolder.vue';

const props = defineProps({
  folderTree: {
    type: Array,
    required: true,
  },
  canDelete: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  'folder-selected',
  'create-folder',
  'create-sub-folder',
  'edit-folder',
  'toggle-visibility',
  'delete-folder',
]);

// 树形组件配置
const treeProps = {
  children: 'children',
  label: 'name',
};

// 右键菜单
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null,
});

// 初始化
onMounted(() => {
  document.addEventListener('click', hideContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu);
});

// 节点点击
const handleNodeClick = (data) => {
  emit('folder-selected', data);
};

// 节点右键点击
const handleNodeRightClick = (event, data) => {
  event.preventDefault();
  contextMenu.visible = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.node = data;
};

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenu.visible = false;
};
</script>

<style lang="scss" scoped>
.folder-tree {
  height: 100%;
  display: flex;
  flex-direction: column;

  .tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #eee;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
  }

  .tree-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;

    .kml-basemap-section {
      margin-bottom: 16px;
    }
  }
}

// 移动端优化
@media (max-width: 768px) {
  .folder-tree {
    .tree-header {
      padding: 12px;
      flex-wrap: wrap;
      gap: 8px;

      h3 {
        font-size: 14px;
        flex: 1;
      }

      .el-button {
        font-size: 12px;
      }
    }

    .tree-content {
      padding: 12px;

      // 优化树节点触摸区域
      :deep(.el-tree-node__content) {
        padding: 8px 4px;
        min-height: 40px;
      }

      :deep(.el-tree-node__label) {
        font-size: 14px;
      }
    }
  }
}
</style>
