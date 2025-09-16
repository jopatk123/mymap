<template>
  <el-form-item label="文件夹" prop="folderId">
    <el-select
      v-model="value"
      placeholder="请选择文件夹"
      clearable
      :disabled="disabled"
      style="width: 100%"
    >
      <el-option
        v-for="folder in availableFolders"
        :key="folder.id"
        :label="folder.name"
        :value="folder.id"
      />
    </el-select>
  </el-form-item>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useFolderStore } from '@/store/folder.js';

const folderStore = useFolderStore();

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: null, // 默认为null，由父组件设置具体的默认文件夹ID
  },
  folders: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  // 新增 prop，用于控制是否使用全局状态
  useGlobalStore: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const value = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 使用全局 store 数据或者传入的 folders prop
const availableFolders = computed(() => {
  if (props.useGlobalStore) {
    return folderStore.flatFolders || [];
  }
  return props.folders || [];
});

// 初始化时加载文件夹数据
onMounted(async () => {
  if (props.useGlobalStore && (!folderStore.flatFolders || folderStore.flatFolders.length === 0)) {
    try {
      await folderStore.fetchFolders();
    } catch (error) {
      console.warn('加载文件夹数据失败:', error);
    }
  }
});
</script>

<style scoped>
.el-select {
  width: 100%;
}
</style>
