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
    @open-batch-upload="$emit('open-batch-upload')"
    @success="$emit('upload-success')"
  />

  <!-- 批量上传对话框（由父组件控制显示） -->
  <PanoramaBatchUploadDialog
    v-if="showBatchUploadDialog !== undefined"
    :model-value="showBatchUploadDialog"
    @update:model-value="$emit('update:showBatchUploadDialog', $event)"
    @success="$emit('upload-success')"
  />
</template>

<script setup>
import PanoramaModal from '@/components/map/PanoramaModal.vue';
import UploadDialog from '@/components/common/UploadDialog.vue';
import PanoramaBatchUploadDialog from '@/components/common/PanoramaBatchUploadDialog.vue';

defineProps({
  showPanoramaModal: {
    type: Boolean,
    required: true,
  },
  selectedPanorama: {
    type: Object,
    default: null,
  },
  showUploadDialog: {
    type: Boolean,
    required: true,
  },
  showBatchUploadDialog: {
    type: Boolean,
    default: undefined,
  },
});

defineEmits([
  'update:showPanoramaModal',
  'update:showUploadDialog',
  'update:showBatchUploadDialog',

  'panorama-deleted',
  'upload-success',
  'open-batch-upload',
]);
</script>

<style lang="scss" scoped>
// 对话框样式由各自组件管理
</style>
