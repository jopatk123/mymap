<template>
  <el-dialog
    v-model="dialogVisible"
    title="设置等高线参数"
    width="400px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px" @submit.prevent="handleConfirm">
      <el-form-item label="等高线间距">
        <el-input-number
          v-model="form.interval"
          :min="1"
          :max="1000"
          :step="10"
          placeholder="请输入间距（米）"
          style="width: 100%"
        />
        <div style="color: #999; font-size: 12px; margin-top: 4px">
          建议：平原地区 10-20米，丘陵 50米，山地 100-200米
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  defaultInterval: {
    type: Number,
    default: 50,
  },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const dialogVisible = ref(props.modelValue);
const form = ref({
  interval: props.defaultInterval,
});

watch(
  () => props.modelValue,
  (val) => {
    dialogVisible.value = val;
    if (val) {
      form.value.interval = props.defaultInterval;
    }
  }
);

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

const handleConfirm = () => {
  emit('confirm', form.value.interval);
  dialogVisible.value = false;
};

const handleCancel = () => {
  emit('cancel');
  dialogVisible.value = false;
};

const handleClose = () => {
  emit('cancel');
};
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
