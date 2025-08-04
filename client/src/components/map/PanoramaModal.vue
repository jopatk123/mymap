<template>
  <PanoramaInfoModal
    v-model:visible="modalVisible"
    :panorama="panorama"
    :loading="isLoading"
    @close="handleClose"
    @view="handleOpenViewer"
    @copy-coordinate="handleCopyCoordinate"
    @open-new-tab="handleOpenInNewTab"

  />
  
  <PanoramaViewer
    v-model:visible="viewerVisible"
    :loading="isLoading"
    :auto-rotating="autoRotating"
    @close="closeViewer"
    @toggle-auto-rotate="toggleAutoRotate"
    @toggle-fullscreen="toggleFullscreen"
    @reset-view="resetView"
  />
</template>

<script setup>
import { computed } from 'vue'
import { usePanoramaModal } from '@/composables/usePanoramaModal'
import { usePanoramaViewer } from '@/composables/usePanoramaViewer'
import PanoramaInfoModal from './panorama/PanoramaInfoModal.vue'
import PanoramaViewer from './panorama/PanoramaViewer.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  panorama: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'panorama-deleted'])

// 使用组合式函数
const {
  visible,
  handleClose: modalHandleClose,
  copyCoordinate,
  openInNewTab,
  deletePanorama
} = usePanoramaModal()

const {
  viewerVisible,
  autoRotating,
  isLoading,
  openViewer,
  closeViewer,
  toggleAutoRotate,
  toggleFullscreen,
  resetView
} = usePanoramaViewer()

// 计算属性：同步外部 v-model
const modalVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 事件处理
const handleClose = () => {
  modalVisible.value = false
  modalHandleClose()
}

const handleOpenViewer = () => {
  openViewer(props.panorama)
}

const handleCopyCoordinate = () => {
  copyCoordinate(props.panorama)
}

const handleOpenInNewTab = () => {
  openInNewTab(props.panorama)
}


</script>

<style lang="scss" scoped>
// 样式已移至子组件中
</style>