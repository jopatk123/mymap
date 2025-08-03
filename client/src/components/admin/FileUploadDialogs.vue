<template>
  <div>
    <!-- 上传对话框 -->
    <UploadDialog
      v-model="uploadDialogs.showUploadDialog"
      @success="$emit('upload-success')"
    />
    
    <!-- 视频上传对话框 -->
    <VideoUploadDialog
      v-model="uploadDialogs.showVideoUploadDialog"
      @success="$emit('upload-success')"
    />
    
    <!-- KML上传对话框 -->
    <KmlUploadDialog
      v-model="uploadDialogs.showKmlUploadDialog"
      @success="$emit('upload-success')"
    />
  </div>
</template>

<script setup>
import UploadDialog from '@/components/common/UploadDialog.vue'
import VideoUploadDialog from '@/components/common/VideoUploadDialog.vue'
import KmlUploadDialog from '@/components/common/KmlUploadDialog.vue'

const props = defineProps({
  uploadDialogs: {
    type: Object,
    required: true
  }
})

defineEmits(['upload-success'])
</script>