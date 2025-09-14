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
        v-for="folder in folders"
        :key="folder.id"
        :label="folder.name"
        :value="folder.id"
      />
    </el-select>
  </el-form-item>
</template>

<script setup>
import { computed } from 'vue';

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
});

const emit = defineEmits(['update:modelValue']);

const value = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>

<style scoped>
.el-select {
  width: 100%;
}
</style>
