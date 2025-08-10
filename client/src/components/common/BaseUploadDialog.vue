<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="600px"
    @close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="computedRules"
      label-width="100px"
    >
      <!-- 通用表单项 -->
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          :placeholder="titlePlaceholder"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          :placeholder="descriptionPlaceholder"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <!-- 坐标输入（条件渲染） -->
      <BaseCoordinateInput 
        v-if="needsCoordinates"
        v-model="coordinates"
        :show-location-btn="showLocationBtn"
        :validation-rules="coordinateRules"
      />
      
      <!-- 文件上传区域 - 插槽 -->
      <slot name="file-upload" :form="form" :uploadRef="uploadRef" />
      
      <!-- 自定义内容区域 - 插槽 -->
      <slot name="custom-content" :form="form" />
      
      <!-- 文件夹选择 -->
      <BaseFolderSelect 
        v-model="form.folderId"
        :folders="folders"
      />
      
      <!-- 处理状态显示 -->
      <BaseProcessingStatus 
        v-if="processing || uploading"
        :processing="processing"
        :processing-text="processingText"
        :uploading="uploading"
        :upload-progress="uploadProgress"
      />
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="showBatchButton" @click="$emit('batch-upload')">批量上传</el-button>
        <el-button @click="handleClose">取消</el-button>
        <el-button
          @click="handleSubmit"
          type="primary"
          :loading="uploading"
          :disabled="!effectiveCanSubmit"
        >
          {{ submitButtonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useBaseUploadDialog } from '@/composables/use-base-upload-dialog'
import BaseCoordinateInput from './BaseCoordinateInput.vue'
import BaseFolderSelect from './BaseFolderSelect.vue'
import BaseProcessingStatus from './BaseProcessingStatus.vue'

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, required: true },
  titlePlaceholder: { type: String, default: '请输入标题' },
  descriptionPlaceholder: { type: String, default: '请输入描述' },
  needsCoordinates: { type: Boolean, default: false },
  showLocationBtn: { type: Boolean, default: false },
  additionalRules: { type: Object, default: () => ({}) },
  fileValidator: { type: Function, default: null },
  submitHandler: { type: Function, required: true },
  externalCanSubmit: { type: Boolean, default: true },
  showBatchButton: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'success', 'batch-upload'])

const {
  visible,
  form,
  formRef,
  uploadRef,
  folders,
  processing,
  processingText,
  uploading,
  uploadProgress,
  computedRules,
  coordinates,
  canSubmit,
  submitButtonText,
  handleClose,
  handleSubmit,
  resetForm
} = useBaseUploadDialog(props, emit)

// 坐标验证规则
const coordinateRules = computed(() => {
  if (!props.needsCoordinates) return {}
  
  return {
    lat: [
      { required: true, message: '请输入纬度', trigger: 'blur' },
      { 
        validator: (rule, value, callback) => {
          const lat = parseFloat(value)
          if (isNaN(lat) || lat < -90 || lat > 90) {
            callback(new Error('纬度必须在 -90 到 90 之间'))
          } else {
            callback()
          }
        }, 
        trigger: 'blur' 
      }
    ],
    lng: [
      { required: true, message: '请输入经度', trigger: 'blur' },
      { 
        validator: (rule, value, callback) => {
          const lng = parseFloat(value)
          if (isNaN(lng) || lng < -180 || lng > 180) {
            callback(new Error('经度必须在 -180 到 180 之间'))
          } else {
            callback()
          }
        }, 
        trigger: 'blur' 
      }
    ]
  }
})

// 添加最终的canSubmit逻辑
const effectiveCanSubmit = computed(() => {
  const baseCanSubmit = canSubmit.value
  const externalCanSubmit = props.externalCanSubmit
  const result = baseCanSubmit && externalCanSubmit
  
  return result
})
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>