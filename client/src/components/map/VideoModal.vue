<template>
  <VideoInfoModal
    v-model:visible="modalVisible"
    :video="video"
    :loading="isLoading"
    @play="handlePlay"
    @copy-coordinate="copyCoordinate"
    @close="handleClose"
  />

  <VideoPlayer v-model:visible="showPlayer" :video="video" @close="handlePlayerClose" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { useVideoModal } from '@/composables/use-video-modal';
import VideoInfoModal from './video/VideoInfoModal.vue';
import VideoPlayer from './video/VideoPlayer.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  video: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'close']);

const showPlayer = ref(false);
const isLoading = computed(() => props.loading);

const { handleClose: modalHandleClose, copyCoordinate } = useVideoModal();

// 计算属性：同步外部 v-model
const modalVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 事件处理
const handleClose = () => {
  modalVisible.value = false;
  modalHandleClose();
};

// 播放视频
const handlePlay = () => {
  showPlayer.value = true;
};

// 关闭播放器
const handlePlayerClose = () => {
  showPlayer.value = false;
};
</script>
