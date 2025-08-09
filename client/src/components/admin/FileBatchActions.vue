<template>
  <div class="batch-actions">
    <span>已选择 {{ selectedCount }} 项</span>
    <div class="batch-buttons">
      <el-dropdown @command="$emit('batch-action', $event)" trigger="click">
        <el-button type="primary" size="small">
          批量操作
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="move">
              <el-icon><FolderOpened /></el-icon>
              移动到文件夹
            </el-dropdown-item>
            <el-dropdown-item command="show">
              <el-icon><View /></el-icon>
              批量显示
            </el-dropdown-item>
            <el-dropdown-item command="hide">
              <el-icon><Hide /></el-icon>
              批量隐藏
            </el-dropdown-item>
            <el-dropdown-item command="delete" divided>
              <el-icon><Delete /></el-icon>
              批量删除
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { 
  ArrowDown, 
  FolderOpened, 
  View, 
  Hide, 
  Delete 
} from '@element-plus/icons-vue'

const props = defineProps({
  selectedCount: {
    type: Number,
    required: true
  }
})

defineEmits(['batch-action'])
</script>

<style lang="scss" scoped>
.batch-actions {
  margin: 16px 0;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  span {
    color: #606266;
    font-size: 14px;
  }
  
  .batch-buttons {
    display: flex;
    gap: 8px;
  }
}

@media (max-width: 768px) {
  .batch-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    
    .batch-buttons {
      width: 100%;
    }
  }
}
</style>