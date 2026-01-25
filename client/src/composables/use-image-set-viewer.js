/**
 * 图片集查看器 composable
 * 提供图片集查看、导航、触摸滑动等功能
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { imageSetApi } from '@/api/image-set.js';
import { ElMessage } from 'element-plus';

/**
 * 触摸滑动 composable
 * @param {Object} options 配置选项
 * @param {Function} options.onSwipeLeft 左滑回调
 * @param {Function} options.onSwipeRight 右滑回调
 * @param {number} options.minSwipeDistance 最小滑动距离，默认50
 * @returns {Object} 触摸事件处理函数
 */
export function useTouchSwipe(options = {}) {
  const { onSwipeLeft, onSwipeRight, minSwipeDistance = 50 } = options;

  const touchStartX = ref(0);
  const touchStartY = ref(0);
  const touchEndX = ref(0);
  const touchEndY = ref(0);

  const handleTouchStart = (e) => {
    touchStartX.value = e.touches[0].clientX;
    touchStartY.value = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.value = e.touches[0].clientX;
    touchEndY.value = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaX = touchEndX.value - touchStartX.value;
    const deltaY = Math.abs(touchEndY.value - touchStartY.value);

    // 确保是水平滑动（水平距离大于垂直距离）
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // 向右滑动
        onSwipeRight?.();
      } else {
        // 向左滑动
        onSwipeLeft?.();
      }
    }

    // 重置触摸状态
    touchStartX.value = 0;
    touchStartY.value = 0;
    touchEndX.value = 0;
    touchEndY.value = 0;
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

/**
 * 图片导航 composable
 * @param {Ref<Array>} images 图片数组
 * @returns {Object} 导航相关状态和方法
 */
export function useImageNavigation(images) {
  const currentIndex = ref(0);

  const currentImage = computed(() => {
    return images.value[currentIndex.value] || null;
  });

  const hasMultipleImages = computed(() => images.value.length > 1);
  const isFirstImage = computed(() => currentIndex.value === 0);
  const isLastImage = computed(() => currentIndex.value === images.value.length - 1);

  const prevImage = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    }
  };

  const nextImage = () => {
    if (currentIndex.value < images.value.length - 1) {
      currentIndex.value++;
    }
  };

  const goToImage = (index) => {
    if (index >= 0 && index < images.value.length) {
      currentIndex.value = index;
    }
  };

  const resetIndex = () => {
    currentIndex.value = 0;
  };

  return {
    currentIndex,
    currentImage,
    hasMultipleImages,
    isFirstImage,
    isLastImage,
    prevImage,
    nextImage,
    goToImage,
    resetIndex,
  };
}

/**
 * 移动端检测 composable
 * @returns {Object} 移动端相关状态和方法
 */
export function useMobileDetection() {
  const isMobile = ref(false);

  const checkMobile = () => {
    isMobile.value =
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  onMounted(() => {
    window.addEventListener('resize', checkMobile);
    checkMobile();
  });

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
  });

  return {
    isMobile,
    checkMobile,
  };
}

/**
 * 图片集数据加载 composable
 * @param {Object} props 组件 props
 * @returns {Object} 数据加载相关状态和方法
 */
export function useImageSetData(props) {
  const imageSet = ref(null);
  const images = ref([]);
  const loading = ref(false);

  const loadImageSet = async () => {
    // 如果 initialImageSet 包含 images 数组，直接使用
    if (props.initialImageSet?.images && props.initialImageSet.images.length > 0) {
      imageSet.value = props.initialImageSet;
      images.value = props.initialImageSet.images;
      return;
    }

    // 否则根据 imageSetId 或 initialImageSet.id 从 API 获取完整数据
    const imageSetId = props.imageSetId || props.initialImageSet?.id;
    if (!imageSetId) {
      // 如果有 initialImageSet 但没有 images，仍然设置基本信息
      if (props.initialImageSet) {
        imageSet.value = props.initialImageSet;
        images.value = [];
      }
      return;
    }

    loading.value = true;
    try {
      const response = await imageSetApi.getImageSet(imageSetId);

      // API 响应拦截器返回的是解包后的图片集对象 { id, images, ... }
      const data = response?.data || response;

      if (data) {
        imageSet.value = data;
        images.value = Array.isArray(data.images) ? data.images : [];
      }
    } catch (error) {
      console.error('加载图片集失败:', error);
      ElMessage.error('加载图片集失败');
      if (props.initialImageSet) {
        imageSet.value = props.initialImageSet;
        images.value = [];
      }
    } finally {
      loading.value = false;
    }
  };

  const resetData = () => {
    imageSet.value = null;
    images.value = [];
  };

  return {
    imageSet,
    images,
    loading,
    loadImageSet,
    resetData,
  };
}

/**
 * 键盘导航 composable
 * @param {Object} options 配置选项
 * @param {Ref<boolean>} options.visible 可见性状态
 * @param {Ref<boolean>} options.isFullscreen 全屏状态
 * @param {Function} options.onPrev 上一张回调
 * @param {Function} options.onNext 下一张回调
 * @param {Function} options.onClose 关闭回调
 * @param {Function} options.onExitFullscreen 退出全屏回调
 * @returns {Object} 键盘事件处理
 */
export function useKeyboardNavigation(options) {
  const { visible, isFullscreen, onPrev, onNext, onClose, onExitFullscreen } = options;

  const handleKeydown = (e) => {
    if (!visible.value) return;

    switch (e.key) {
      case 'ArrowLeft':
        onPrev?.();
        break;
      case 'ArrowRight':
        onNext?.();
        break;
      case 'Escape':
        if (isFullscreen.value) {
          onExitFullscreen?.();
        } else {
          onClose?.();
        }
        break;
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  return {
    handleKeydown,
  };
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 下载图片
 * @param {Object} image 图片对象
 * @param {number} index 图片索引（用于默认文件名）
 */
export function downloadImage(image, index = 0) {
  if (!image) return;

  const url = image.image_url || image.imageUrl;
  const filename = image.file_name || `image-${index + 1}.jpg`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
