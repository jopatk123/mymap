<template>
  <el-dialog
    :model-value="visible"
    :title="editingFolder ? '编辑文件夹' : '新建文件夹'"
    width="400px"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
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
        <el-switch v-model="folderForm.isVisible" active-text="显示" inactive-text="隐藏" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingFolder ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  editingFolder: {
    type: Object,
    default: null,
  },
  flatFolders: {
    type: Array,
    required: true,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  initialParentId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'submit', 'close']);

const formRef = ref(null);

// 表单数据
const folderForm = reactive({
  name: '',
  parentId: null,
  isVisible: true,
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入文件夹名称', trigger: 'blur' },
    { min: 1, max: 50, message: '文件夹名称长度在 1 到 50 个字符', trigger: 'blur' },
  ],
};

// 重置表单 - 移到 watch 之前定义，避免初始化顺序问题
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }

  folderForm.name = '';
  folderForm.parentId = props.initialParentId || null;
  folderForm.isVisible = true;
};

// 监听编辑文件夹变化
watch(
  () => props.editingFolder,
  (newFolder) => {
    if (newFolder) {
      folderForm.name = newFolder.name;
      folderForm.parentId = newFolder.parent_id;
      folderForm.isVisible = newFolder.is_visible;
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// 监听初始父文件夹ID
watch(
  () => props.initialParentId,
  (newParentId) => {
    if (newParentId && !props.editingFolder) {
      folderForm.parentId = newParentId;
    }
  },
  { immediate: true }
);

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    emit('submit', { ...folderForm });
  } catch (error) {
    // 验证失败
  }
};

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
  resetForm();
};
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
