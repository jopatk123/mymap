<template>
  <div class="coordinate-input">
    <el-input-number
      v-model="localLat"
      :precision="6"
      :step="0.000001"
      :min="-90"
      :max="90"
      placeholder="纬度"
      @change="handleChange"
      style="width: 120px; margin-right: 8px;"
    />
    <el-input-number
      v-model="localLng"
      :precision="6"
      :step="0.000001"
      :min="-180"
      :max="180"
      placeholder="经度"
      @change="handleChange"
      style="width: 120px;"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [116.4074, 39.9042]
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const localLat = ref(props.modelValue[1] || 39.9042)
const localLng = ref(props.modelValue[0] || 116.4074)

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  if (newValue && Array.isArray(newValue) && newValue.length >= 2) {
    localLng.value = newValue[0]
    localLat.value = newValue[1]
  }
}, { immediate: true })

// 处理变化
const handleChange = () => {
  const newValue = [localLng.value, localLat.value]
  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>

<style scoped>
.coordinate-input {
  display: flex;
  align-items: center;
}
</style>