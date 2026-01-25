import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { videoPointStyleApi, panoramaPointStyleApi, imageSetPointStyleApi } from '@/api/point-style.js';
import { notifyPointStyleUpdate, notifyMarkersRefresh } from '@/utils/style-events.js';
import { convertFromApiFormat, convertToApiFormat } from '@/utils/styleConverters.js';

export function usePointStyle() {
  const saving = ref(false);

  // 样式配置
  const videoStyles = ref({});
  const panoramaStyles = ref({});
  const imageSetStyles = ref({});
  const currentStyles = reactive({});
  const originalStyles = ref({});

  // 加载所有样式配置
  const loadAllStyles = async () => {
    try {
      const [videoResponse, panoramaResponse, imageSetResponse] = await Promise.all([
        videoPointStyleApi.getStyles(),
        panoramaPointStyleApi.getStyles(),
        imageSetPointStyleApi.getStyles(),
      ]);

      videoStyles.value = convertFromApiFormat(videoResponse.data);
      panoramaStyles.value = convertFromApiFormat(panoramaResponse.data);
      imageSetStyles.value = convertFromApiFormat(imageSetResponse.data);
    } catch (error) {
      ElMessage.error('加载样式配置失败');
    }
  };

  // 设置当前样式
  const setCurrentStyles = (type) => {
    let styles;
    switch (type) {
      case 'video':
        styles = videoStyles.value;
        break;
      case 'image-set':
        styles = imageSetStyles.value;
        break;
      case 'panorama':
      default:
        styles = panoramaStyles.value;
        break;
    }

    // 清空当前样式对象，然后重新赋值
    Object.keys(currentStyles).forEach((key) => delete currentStyles[key]);
    Object.assign(currentStyles, styles);

    // 保存原始配置
    originalStyles.value = JSON.parse(JSON.stringify(currentStyles));
  };

  // 保存配置
  const saveStyles = async (type) => {
    if (!type) {
      ElMessage.warning('请选择要保存的点位类型');
      return false;
    }

    saving.value = true;

    try {
      if (!currentStyles || Object.keys(currentStyles).length === 0) {
        ElMessage.error('样式数据为空，请重新设置');
        return false;
      }

      const apiConfig = convertToApiFormat(currentStyles);

      if (type === 'video') {
        const response = await videoPointStyleApi.updateStyles(apiConfig);
        videoStyles.value = { ...currentStyles };
        window.videoPointStyles = response.data;

        updateLocalCache('video', response.data);
        notifyPointStyleUpdate('video', response.data);
      } else if (type === 'image-set') {
        const response = await imageSetPointStyleApi.updateStyles(apiConfig);
        imageSetStyles.value = { ...currentStyles };
        window.imageSetPointStyles = response.data;

        updateLocalCache('imageSet', response.data);
        notifyPointStyleUpdate('image-set', response.data);
      } else {
        const response = await panoramaPointStyleApi.updateStyles(apiConfig);
        panoramaStyles.value = { ...currentStyles };
        window.panoramaPointStyles = response.data;

        updateLocalCache('panorama', response.data);
        notifyPointStyleUpdate('panorama', response.data);
      }

      // 通知地图刷新标记
      notifyMarkersRefresh('style-update');

      ElMessage.success('点位样式配置保存成功');
      return true;
    } catch (error) {
      ElMessage.error('保存样式配置失败');
      return false;
    } finally {
      saving.value = false;
    }
  };

  // 重置为默认
  const resetStyles = async (type) => {
    if (!type) {
      ElMessage.warning('请选择要重置的点位类型');
      return false;
    }

    try {
      const result = await ElMessageBox.confirm(
        '确定要重置为默认样式吗？此操作不可撤销。',
        '确认重置',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      if (result === 'confirm') {
        saving.value = true;

        if (type === 'video') {
          const response = await videoPointStyleApi.resetStyles();
          videoStyles.value = convertFromApiFormat(response.data);
          Object.keys(currentStyles).forEach((key) => delete currentStyles[key]);
          Object.assign(currentStyles, videoStyles.value);
          window.videoPointStyles = response.data;

          updateLocalCache('video', response.data);
          notifyPointStyleUpdate('video', response.data);
        } else if (type === 'image-set') {
          const response = await imageSetPointStyleApi.resetStyles();
          imageSetStyles.value = convertFromApiFormat(response.data);
          Object.keys(currentStyles).forEach((key) => delete currentStyles[key]);
          Object.assign(currentStyles, imageSetStyles.value);
          window.imageSetPointStyles = response.data;

          updateLocalCache('imageSet', response.data);
          notifyPointStyleUpdate('image-set', response.data);
        } else {
          const response = await panoramaPointStyleApi.resetStyles();
          panoramaStyles.value = convertFromApiFormat(response.data);
          Object.keys(currentStyles).forEach((key) => delete currentStyles[key]);
          Object.assign(currentStyles, panoramaStyles.value);
          window.panoramaPointStyles = response.data;

          updateLocalCache('panorama', response.data);
          notifyPointStyleUpdate('panorama', response.data);
        }

        // 通知地图刷新标记
        notifyMarkersRefresh('style-update');

        ElMessage.success('样式已重置为默认配置');
        return true;
      }

      return false;
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('重置样式配置失败');
      }
      return false;
    } finally {
      saving.value = false;
    }
  };

  // 恢复原始样式配置
  const restoreOriginalStyles = (type) => {
    if (originalStyles.value && type) {
      Object.assign(currentStyles, originalStyles.value);

      // 恢复预览样式
      if (type === 'video') {
        videoStyles.value = { ...originalStyles.value };
      } else if (type === 'image-set') {
        imageSetStyles.value = { ...originalStyles.value };
      } else if (type === 'panorama') {
        panoramaStyles.value = { ...originalStyles.value };
      }
    }
  };

  // 更新本地缓存
  const updateLocalCache = (type, newStyles) => {
    try {
      const cached = localStorage.getItem('pointStyles');
      let styles = {};

      if (cached) {
        styles = JSON.parse(cached);
      }

      // 更新指定类型的样式
      styles[type] = newStyles;
      styles.lastUpdated = Date.now();

      localStorage.setItem('pointStyles', JSON.stringify(styles));
    } catch (error) {
      // 静默处理缓存更新失败
    }
  };

  return {
    // 状态
    saving,
    videoStyles,
    panoramaStyles,
    imageSetStyles,
    currentStyles,

    // 方法
    loadAllStyles,
    setCurrentStyles,
    saveStyles,
    resetStyles,
    restoreOriginalStyles,
  };
}
