<template>
  <div class="folder-tree">
    <div class="tree-header">
      <h3>文件夹管理</h3>
      <el-button @click="$emit('create-folder')" type="primary" size="small">
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
        <template #default="{ node, data }">
          <FolderTreeNode
            :data="data"
            @toggle-visibility="$emit('toggle-visibility', data)"
          />
        </template>
      </el-tree>
    </div>
    
    <FolderContextMenu
      v-if="contextMenu.visible"
      :context-menu="contextMenu"
      @create-sub-folder="$emit('create-sub-folder', contextMenu.node)"
      @edit-folder="$emit('edit-folder', contextMenu.node)"
      @toggle-visibility="$emit('toggle-visibility', contextMenu.node)"
      @delete-folder="$emit('delete-folder', contextMenu.node)"
      @hide="hideContextMenu"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { FolderAdd } from '@element-plus/icons-vue'
import FolderTreeNode from './FolderTreeNode.vue'
import FolderContextMenu from './FolderContextMenu.vue'
import KMLBaseMapFolder from '@/components/map/kml-basemap/KMLBaseMapFolder.vue'

defineProps({
  folderTree: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'folder-selected',
  'create-folder',
  'create-sub-folder',
  'edit-folder',
  'toggle-visibility',
  'delete-folder'
])

// 树形组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 右键菜单
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null
})

// 初始化
onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})

// 节点点击
const handleNodeClick = (data) => {
  emit('folder-selected', data)
}

// 节点右键点击
const handleNodeRightClick = (event, data) => {
  event.preventDefault()
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.node = data
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenu.visible = false
}
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
</style>