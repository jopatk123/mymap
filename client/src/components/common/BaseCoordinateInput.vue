<template>
  <div class="coordinate-input">
    <el-row :gutter="12">
      <el-col :span="12">
        <el-form-item label="纬度" prop="lat">
          <el-input
            v-model="lat"
            placeholder="纬度 (-90 ~ 90)"
            :disabled="disabled"
            @blur="validateCoordinate('lat')"
          >
            <template #suffix>
              <span class="coordinate-unit">°</span>
            </template>
          </el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="经度" prop="lng">
          <el-input
            v-model="lng"
            placeholder="经度 (-180 ~ 180)"
            :disabled="disabled"
            @blur="validateCoordinate('lng')"
          >
            <template #suffix>
              <span class="coordinate-unit">°</span>
            </template>
          </el-input>
        </el-form-item>
      </el-col>
    </el-row>
    
    <div v-if="showLocationBtn" class="coordinate-actions">
      <el-button
        type="primary"
        :icon="Location"
        size="small"
        :disabled="disabled"
        @click="getCurrentLocation"
      >
        获取当前位置
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Location } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({ lat: '', lng: '' })
  },
  showLocationBtn: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  validationRules: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

// 创建双向绑定的计算属性
const lat = computed({
  get: () => props.modelValue.lat,
  set: (value) => emit('update:modelValue', { ...props.modelValue, lat: value })
})

const lng = computed({
  get: () => props.modelValue.lng,
  set: (value) => emit('update:modelValue', { ...props.modelValue, lng: value })
})

// 验证坐标
const validateCoordinate = (type) => {
  const value = parseFloat(props.modelValue[type])
  let isValid = true
  let message = ''

  if (isNaN(value)) {
    isValid = false
    message = '请输入有效的数字'
  } else if (type === 'lat' && (value < -90 || value > 90)) {
    isValid = false
    message = '纬度必须在 -90 到 90 之间'
  } else if (type === 'lng' && (value < -180 || value > 180)) {
    isValid = false
    message = '经度必须在 -180 到 180 之间'
  }

  if (!isValid) {
    ElMessage.warning(message)
  }
}

// 获取当前位置
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.error('您的浏览器不支持地理定位')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      emit('update:modelValue', {
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6)
      })
      ElMessage.success('已获取当前位置')
    },
    (error) => {
      ElMessage.error('获取位置失败: ' + error.message)
    }
  )
}
</script>

<style scoped>
.coordinate-input {
  margin-bottom: 16px;
}

.coordinate-unit {
  color: #909399;
  font-size: 12px;
}

.coordinate-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.coordinate-actions .el-button {
  font-size: 12px;
}
</style>