import { ref, nextTick } from 'vue';

export function usePanorama() {
  const viewer = ref(null);
  const isViewerOpen = ref(false);
  const currentPanorama = ref(null);
  const isLoading = ref(false);

  // 初始化全景查看器
  const initViewer = async (containerId, panoramaUrl, options = {}) => {
    if (!window.pannellum) {
      console.error('Pannellum library not loaded');
      return null;
    }

    // 检查容器是否存在
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('容器不存在:', containerId);
      return null;
    }

    const defaultOptions = {
      type: 'equirectangular',
      panorama: panoramaUrl,
      autoLoad: true,
      autoRotate: -2,
      compass: true,
      northOffset: 0,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      showControls: true,
      mouseZoom: true,
      doubleClickZoom: true,
      draggable: true,
      keyboardZoom: true,
      crossOrigin: 'anonymous',

      // 关键的全景图参数 - 确保正确识别等距柱状投影
      haov: 360,
      vaov: 180,
      vOffset: 0,

      // 视角设置
      hfov: 75,
      minHfov: 50,
      maxHfov: 120,

      // 防止显示为平面图片的关键参数
      pitch: 0,
      yaw: 0,

      // 调试信息
      debug: true,

      // 确保渲染模式正确
      backgroundColor: [0, 0, 0],

      ...options,
    };

    try {
      isLoading.value = true;

      // 等待DOM更新
      await nextTick();

      // 等待额外时间确保容器完全渲染
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 检查容器样式
      const computedStyle = window.getComputedStyle(container);

      // 确保容器有尺寸 - 使用固定像素值确保最小尺寸
      if (computedStyle.width === '0px' || computedStyle.height === '0px') {
        container.style.width = '100%';
        container.style.height = '400px'; // 确保最小高度
        container.style.minHeight = '400px';
      }

      // 强制设置父容器高度
      const parent = container.parentElement;
      if (parent) {
        parent.style.height = '100%';
      }

      // 验证图片URL - 检查是否为2:1比例的全景图
      const testImg = new Image();
      testImg.onload = () => {
        const ratio = testImg.width / testImg.height;
        // 警告非标准比例
        if (Math.abs(ratio - 2) > 0.1) {
          console.warn('图片比例可能不是标准全景图比例(2:1), 当前比例:', ratio);
        }
      };
      testImg.onerror = () => {
        console.error('图片加载失败:', panoramaUrl);
      };
      testImg.src = panoramaUrl;

      viewer.value = window.pannellum.viewer(containerId, defaultOptions);

      // 添加事件监听
      setupViewerEvents();

      // 强制重新渲染 - 增加延迟确保容器完全加载
      setTimeout(() => {
        if (viewer.value) {
          viewer.value.resize();

          // 再次检查渲染状态
          setTimeout(() => {
            if (viewer.value) {
              viewer.value.resize();
            }
          }, 1000);
        }
      }, 500);

      isLoading.value = false;
      return viewer.value;
    } catch (error) {
      console.error('初始化全景查看器失败:', error);
      isLoading.value = false;
      return null;
    }
  };

  // 设置查看器事件
  const setupViewerEvents = () => {
    if (!viewer.value) return;

    viewer.value.on('load', () => {
      isLoading.value = false;
    });

    viewer.value.on('error', (error) => {
      console.error('全景图加载错误:', error);
      isLoading.value = false;
    });

    viewer.value.on('scenechange', (sceneId) => {});

    viewer.value.on('mousedown', () => {});

    viewer.value.on('mouseup', () => {});
  };

  // 打开全景图查看器
  const openViewer = async (panorama, containerId = 'panorama-viewer') => {
    currentPanorama.value = panorama;
    isViewerOpen.value = true;

    // 等待模态框打开后再初始化查看器
    await nextTick();

    if (panorama.imageUrl) {
      await initViewer(containerId, panorama.imageUrl);
    }
  };

  // 关闭全景图查看器
  const closeViewer = () => {
    if (viewer.value) {
      viewer.value.destroy();
      viewer.value = null;
    }
    isViewerOpen.value = false;
    currentPanorama.value = null;
  };

  // 切换全景图
  const switchPanorama = async (panoramaUrl) => {
    if (!viewer.value) return;

    try {
      isLoading.value = true;
      viewer.value.loadScene(panoramaUrl);
    } catch (error) {
      console.error('切换全景图失败:', error);
      isLoading.value = false;
    }
  };

  // 设置视角
  const setView = (pitch, yaw, hfov) => {
    if (!viewer.value) return;

    viewer.value.setPitch(pitch || 0);
    viewer.value.setYaw(yaw || 0);
    if (hfov) {
      viewer.value.setHfov(hfov);
    }
  };

  // 获取当前视角
  const getView = () => {
    if (!viewer.value) return null;

    return {
      pitch: viewer.value.getPitch(),
      yaw: viewer.value.getYaw(),
      hfov: viewer.value.getHfov(),
    };
  };

  // 开始/停止自动旋转
  const toggleAutoRotate = (speed = -2) => {
    if (!viewer.value) return;

    const currentSpeed = viewer.value.getConfig().autoRotate;
    if (currentSpeed) {
      viewer.value.stopAutoRotate();
    } else {
      viewer.value.startAutoRotate(speed);
    }
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!viewer.value) return;

    viewer.value.toggleFullscreen();
  };

  // 添加热点
  const addHotspot = (hotspot) => {
    if (!viewer.value) return;

    viewer.value.addHotSpot({
      id: hotspot.id,
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      type: hotspot.type || 'info',
      text: hotspot.text,
      clickHandlerFunc: hotspot.onClick || (() => {}),
      ...hotspot,
    });
  };

  // 移除热点
  const removeHotspot = (hotspotId) => {
    if (!viewer.value) return;

    viewer.value.removeHotSpot(hotspotId);
  };

  // 销毁查看器
  const destroyViewer = () => {
    if (viewer.value) {
      viewer.value.destroy();
      viewer.value = null;
    }
  };

  return {
    viewer,
    isViewerOpen,
    currentPanorama,
    isLoading,
    initViewer,
    openViewer,
    closeViewer,
    switchPanorama,
    setView,
    getView,
    toggleAutoRotate,
    toggleFullscreen,
    addHotspot,
    removeHotspot,
    destroyViewer,
  };
}
