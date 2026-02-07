<template>
  <div>
    <!-- 上传对话框 -->
    <UploadDialog
      v-model="localDialogs.showUploadDialog"
      @open-batch-upload="handleOpenBatchUpload"
      @success="$emit('upload-success')"
    />

    <!-- 视频上传对话框 -->
    <VideoUploadDialog
      v-model="localDialogs.showVideoUploadDialog"
      @success="$emit('upload-success')"
    />

    <!-- 点位上传对话框 -->
    <PointUploadDialog
      v-model="localDialogs.showKmlUploadDialog"
      @success="$emit('upload-success')"
    />

    <!-- 图片集上传对话框 -->
    <ImageSetUploadDialog
      v-model="localDialogs.showImageSetUploadDialog"
      @open-batch-upload="handleOpenImageSetBatchUpload"
      @success="$emit('upload-success')"
    />

    <!-- 图片集批量上传对话框 -->
    <ImageSetBatchUploadDialog
      v-model="localDialogs.showImageSetBatchUploadDialog"
      @success="$emit('upload-success')"
    />

    <!-- 全景批量上传对话框 -->
    <PanoramaBatchUploadDialog
      v-model="localDialogs.showPanoramaBatchUploadDialog"
      @success="$emit('upload-success')"
    />
  </div>
</template>

<script setup>
import UploadDialog from '@/components/common/UploadDialog.vue';
import VideoUploadDialog from '@/components/common/VideoUploadDialog.vue';
import PointUploadDialog from '@/components/common/PointUploadDialog.vue';
import ImageSetUploadDialog from '@/components/common/ImageSetUploadDialog.vue';
import ImageSetBatchUploadDialog from '@/components/common/ImageSetBatchUploadDialog.vue';
import PanoramaBatchUploadDialog from '@/components/common/PanoramaBatchUploadDialog.vue';

import { reactive, watch } from 'vue';

const props = defineProps({
  uploadDialogs: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['upload-success', 'update:upload-dialogs']);

// local reactive copy to avoid mutating prop directly
const localDialogs = reactive({ ...(props.uploadDialogs || {}) });

// sync prop -> local
watch(
  () => props.uploadDialogs,
  (v) => {
    if (v) Object.assign(localDialogs, v);
  },
  { deep: true }
);

// sync local -> parent (emit updated copy)
watch(
  localDialogs,
  (v) => {
    emit('update:upload-dialogs', { ...v });
  },
  { deep: true }
);

function handleOpenBatchUpload() {
  localDialogs.showUploadDialog = false;
  localDialogs.showPanoramaBatchUploadDialog = true;
}

function handleOpenImageSetBatchUpload() {
  localDialogs.showImageSetUploadDialog = false;
  localDialogs.showImageSetBatchUploadDialog = true;
}
</script>
