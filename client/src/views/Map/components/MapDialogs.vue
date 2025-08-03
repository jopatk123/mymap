<template>
  <!-- 全景图详情模态框 -->
  <PanoramaModal
    :model-value="showPanoramaModal"
    :panorama="selectedPanorama"
    @update:model-value="$emit('update:showPanoramaModal', $event)"
    @panorama-deleted="$emit('panorama-deleted', $event)"
  />
  
  <!-- 上传对话框 -->
  <UploadDialog
    :model-value="showUploadDialog"
    @update:model-value="$emit('update:showUploadDialog', $event)"
    @success="$emit('upload-success')"
  />
  
  <!-- 设置对话框 -->
  <SettingsDialog
    :model-value="showSettings"
    @update:model-value="$emit('update:showSettings', $event)"
  />
</template>

<script setup>
import PanoramaModal from '@/components/map/PanoramaModal.vue'
import UploadDialog from '@/components/common/UploadDialog.vue'
import SettingsDialog from '@/components/common/SettingsDialog.vue'

defineProps({
  showPanoramaModal: {
    type: Boolean,
    required: true
  },
  selectedPanorama: {
    type: Object,
    default: null
  },
  showUploadDialog: {
    type: Boolean,
    required: true
  },
  showSettings: {
    type: Boolean,
    required: true
  }
})

defineEmits([
  'update:showPanoramaModal',
  'update:showUploadDialog', 
  'update:showSettings',
  'panorama-deleted', 
  'upload-success'
])
</script>

<style lang="scss" scoped>
// 对话框样式由各自组件管理
</style>