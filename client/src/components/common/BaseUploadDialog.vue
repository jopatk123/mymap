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
        <el-button @click="handleClose">取消</el-button>
        <el-button
          @click="handleSubmit"
          type="primary"
          :loading="uploading"
          :disabled="!canSubmit"
        >
          {{ submitButtonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useBaseUploadDialog } from '@/composables/useBaseUploadDialog'
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
  submitHandler: { type: Function, required: true }
})

const emit = defineEmits(['update:modelValue', 'success'])

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
  canSubmit,
  submitButtonText,
  handleClose,
  handleSubmit,
  resetForm
} = useBaseUploadDialog(props, emit)
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>