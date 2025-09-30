import { ref } from 'vue';

/**
 * 管理地理定位逻辑，可注入自定义的 navigator 以便测试。
 */
export function createGeolocationController(options) {
  const {
    setCenter,
    ElMessage,
    navigatorRef = typeof navigator !== 'undefined' ? navigator : undefined,
  } = options;

  const locating = ref(false);

  const locateUser = () => {
    if (!navigatorRef || typeof navigatorRef.geolocation?.getCurrentPosition !== 'function') {
      ElMessage?.warning?.('浏览器不支持地理定位');
      return;
    }

    locating.value = true;

    navigatorRef.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords || {};
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          setCenter(latitude, longitude, 16);
          ElMessage?.success?.('定位成功');
        } else {
          ElMessage?.error?.('定位结果无效');
        }
        locating.value = false;
      },
      () => {
        locating.value = false;
        ElMessage?.error?.('定位失败，请检查位置权限');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return {
    locating,
    locateUser,
  };
}
