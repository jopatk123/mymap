<template>
  <div>
    <!-- 编辑对话框 -->
    <EditDialog
      v-model="localDialogs.showEditDialog"
      :file="currentFile"
      @success="$emit('file-updated')"
    />

    <!-- 查看对话框 -->
    <ViewDialog
      v-model="localDialogs.showViewDialog"
      :file="currentFile"
      @file-deleted="$emit('file-deleted')"
      @edit-file="$emit('edit-file', $event)"
    />

    <!-- 移动到文件夹对话框 -->
    <el-dialog v-model="localDialogs.showMoveDialog" title="移动到文件夹" width="400px">
      <el-form label-width="80px">
        <el-form-item label="目标文件夹">
          <el-select
            :model-value="moveToFolderId"
            placeholder="选择文件夹（留空表示移动到根目录）"
            clearable
            style="width: 100%"
            @update:model-value="$emit('update:moveToFolderId', $event)"
          >
            <el-option
              v-for="folder in validFolders"
              :key="folder.id"
              :label="folder.name || '未命名文件夹'"
              :value="folder.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancelMove">取消</el-button>
          <el-button type="primary" :loading="moving" @click="$emit('move-confirm')">
            移动
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import EditDialog from '@/components/admin/EditDialog.vue';
import ViewDialog from '@/components/admin/ViewDialog.vue';
import { reactive, watch } from 'vue';

const props = defineProps({
  actionDialogs: {
    type: Object,
    required: true,
  },
  currentFile: {
    type: Object,
    default: null,
  },
  moveToFolderId: {
    type: [String, Number],
    default: null,
  },
  validFolders: {
    type: Array,
    default: () => [],
  },
  moving: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'file-updated',
  'file-deleted',
  'move-confirm',
  'update:moveToFolderId',
  'update:actionDialogs',
]);

// local reactive copy to avoid mutating props directly
const localDialogs = reactive({ ...(props.actionDialogs || {}) });

watch(
  () => props.actionDialogs,
  (v) => {
    if (v) Object.assign(localDialogs, v);
  },
  { deep: true }
);

watch(
  localDialogs,
  (v) => {
    emit('update:actionDialogs', { ...v });
  },
  { deep: true }
);

function handleCancelMove() {
  localDialogs.showMoveDialog = false;
}
</script>
