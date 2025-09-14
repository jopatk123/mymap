<template>
  <div class="coordinate-input">
    <el-input-number
      v-model="localLat"
      :precision="6"
      :step="0.000001"
      :min="-90"
      :max="90"
      placeholder="纬度"
      style="width: 120px; margin-right: 8px"
      @change="handleChange"
    />
    <el-input-number
      v-model="localLng"
      :precision="6"
      :step="0.000001"
      :min="-180"
      :max="180"
      placeholder="经度"
      style="width: 120px"
      @change="handleChange"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [116.4074, 39.9042],
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const localLat = ref(props.modelValue[1] ? parseFloat(props.modelValue[1]) : null);
const localLng = ref(props.modelValue[0] ? parseFloat(props.modelValue[0]) : null);

// 监听props变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && Array.isArray(newValue) && newValue.length >= 2) {
      // 确保值是数字类型
      const lng = newValue[0];
      const lat = newValue[1];
      localLng.value = lng !== null && lng !== undefined ? parseFloat(lng) : null;
      localLat.value = lat !== null && lat !== undefined ? parseFloat(lat) : null;
    } else {
      localLng.value = null;
      localLat.value = null;
    }
  },
  { immediate: true }
);

// 处理变化
const handleChange = () => {
  const newValue = [
    localLng.value !== null ? localLng.value : null,
    localLat.value !== null ? localLat.value : null,
  ];
  emit('update:modelValue', newValue);
  emit('change', newValue);
};
</script>

<style scoped>
.coordinate-input {
  display: flex;
  align-items: center;
}
</style>
