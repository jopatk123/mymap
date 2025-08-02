<template>
  <div class="folder-tree">
    <div class="tree-header">
      <h3>文件夹管理</h3>
      <el-button @click="showCreateDialog = true" type="primary" size="small">
        <el-icon><FolderAdd /></el-icon>
        新建文件夹
      </el-button>
    </div>
    
    <div class="tree-content">
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
          <div class="tree-node">
            <div class="node-content">
              <el-icon class="folder-icon">
                <Folder v-if="data.is_visible" />
                <FolderOpened v-else />
              </el-icon>
              <span class="node-label" :class="{ 'hidden': !data.is_visible }">
                {{ data.name }}
              </span>
              <span class="panorama-count">({{ (data.panoramaCount || 0) + (data.videoPointCount || 0) }})</span>
            </div>
            
            <div class="node-actions">
              <el-button
                @click.stop="toggleFolderVisibility(data)"
                :type="data.is_visible ? 'info' : 'warning'"
                size="small"
                text
              >
                <el-icon>
                  <View v-if="data.is_visible" />
                  <Hide v-else />
                </el-icon>
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>
    </div>
    
    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="createSubFolder">
        <el-icon><FolderAdd /></el-icon>
        新建子文件夹
      </div>
      <div class="menu-item" @click="editFolder">
        <el-icon><Edit /></el-icon>
        编辑文件夹
      </div>
      <div class="menu-item" @click="toggleFolderVisibility(contextMenu.node)">
        <el-icon>
          <View v-if="contextMenu.node.is_visible" />
          <Hide v-else />
        </el-icon>
        {{ contextMenu.node.is_visible ? '隐藏' : '显示' }}
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="deleteFolder">
        <el-icon><Delete /></el-icon>
        删除文件夹
      </div>
    </div>
    
    <!-- 创建/编辑文件夹对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingFolder ? '编辑文件夹' : '新建文件夹'"
      width="400px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="folderForm" :rules="formRules" label-width="80px">
        <el-form-item label="文件夹名" prop="name">
          <el-input
            v-model="folderForm.name"
            placeholder="请输入文件夹名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="父文件夹" prop="parentId">
          <el-select
            v-model="folderForm.parentId"
            placeholder="选择父文件夹（可选）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="folder in flatFolders"
              :key="folder.id"
              :label="folder.name"
              :value="folder.id"
              :disabled="editingFolder && folder.id === editingFolder.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="可见性">
          <el-switch
            v-model="folderForm.isVisible"
            active-text="显示"
            inactive-text="隐藏"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button @click="handleSubmit" type="primary" :loading="submitting">
            {{ editingFolder ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  FolderAdd, 
  Folder, 
  FolderOpened, 
  Edit, 
  Delete, 
  View, 
  Hide 
} from '@element-plus/icons-vue'
import { useFolderStore } from '@/store/folder.js'

const emit = defineEmits(['folder-selected', 'folder-updated'])

// Store
const folderStore = useFolderStore()

// 响应式数据
const treeRef = ref(null)
const formRef = ref(null)
const showCreateDialog = ref(false)
const submitting = ref(false)
const editingFolder = ref(null)

// 树形组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 文件夹数据
const folderTree = computed(() => folderStore.folderTree)
const flatFolders = computed(() => folderStore.flatFolders)

// 右键菜单
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null
})

// 表单数据
const folderForm = reactive({
  name: '',
  parentId: null,
  isVisible: true
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入文件夹名称', trigger: 'blur' },
    { min: 1, max: 50, message: '文件夹名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

// 初始化
onMounted(() => {
  loadFolders()
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})

// 加载文件夹数据
const loadFolders = async () => {
  try {
    await folderStore.fetchFolders()
  } catch (error) {
    ElMessage.error('加载文件夹失败: ' + error.message)
  }
}

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

// 切换文件夹可见性
const toggleFolderVisibility = async (folder) => {
  try {
    await folderStore.updateFolderVisibility(folder.id, !folder.is_visible)
    ElMessage.success(`文件夹已${folder.is_visible ? '隐藏' : '显示'}`)
    await loadFolders()
    emit('folder-updated')
  } catch (error) {
    ElMessage.error('更新文件夹可见性失败: ' + error.message)
  }
  hideContextMenu()
}

// 创建子文件夹
const createSubFolder = () => {
  folderForm.parentId = contextMenu.node.id
  showCreateDialog.value = true
  hideContextMenu()
}

// 编辑文件夹
const editFolder = () => {
  editingFolder.value = contextMenu.node
  folderForm.name = contextMenu.node.name
  folderForm.parentId = contextMenu.node.parent_id
  folderForm.isVisible = contextMenu.node.is_visible
  showCreateDialog.value = true
  hideContextMenu()
}

// 删除文件夹
const deleteFolder = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹"${contextMenu.node.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await folderStore.deleteFolder(contextMenu.node.id)
    ElMessage.success('文件夹删除成功')
    await loadFolders()
    emit('folder-updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除文件夹失败: ' + error.message)
    }
  }
  hideContextMenu()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    if (editingFolder.value) {
      // 更新文件夹
      await folderStore.updateFolder(editingFolder.value.id, {
        name: folderForm.name,
        parentId: folderForm.parentId,
        isVisible: folderForm.isVisible
      })
      ElMessage.success('文件夹更新成功')
    } else {
      // 创建文件夹
      await folderStore.createFolder({
        name: folderForm.name,
        parentId: folderForm.parentId,
        isVisible: folderForm.isVisible
      })
      ElMessage.success('文件夹创建成功')
    }
    
    showCreateDialog.value = false
    await loadFolders()
    emit('folder-updated')
    
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  folderForm.name = ''
  folderForm.parentId = null
  folderForm.isVisible = true
  editingFolder.value = null
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
  }
}

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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>