export class LocationService {
  constructor() {
    this.locating = false;
    this.callbacks = {
      onLocationStart: null,
      onLocationSuccess: null,
      onLocationError: null,
      onLocationEnd: null,
    };
  }

  // 设置回调函数
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 检查浏览器是否支持地理定位
  isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  // 获取当前位置
  async getCurrentLocation(options = {}) {
    if (!this.isGeolocationSupported()) {
      const error = new Error('浏览器不支持地理定位');
      if (this.callbacks.onLocationError) {
        this.callbacks.onLocationError(error);
      }
      throw error;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    };

    this.locating = true;
    if (this.callbacks.onLocationStart) {
      this.callbacks.onLocationStart();
    }

    try {
      const position = await this.getPosition(defaultOptions);
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      this.locating = false;
      if (this.callbacks.onLocationSuccess) {
        this.callbacks.onLocationSuccess(location);
      }
      if (this.callbacks.onLocationEnd) {
        this.callbacks.onLocationEnd();
      }

      return location;
    } catch (error) {
      this.locating = false;

      const locationError = this.handleLocationError(error);
      if (this.callbacks.onLocationError) {
        this.callbacks.onLocationError(locationError);
      }
      if (this.callbacks.onLocationEnd) {
        this.callbacks.onLocationEnd();
      }

      throw locationError;
    }
  }

  // Promise化的地理定位API
  getPosition(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  // 处理定位错误
  handleLocationError(error) {
    let message = '定位失败';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = '用户拒绝了地理定位请求';
        break;
      case error.POSITION_UNAVAILABLE:
        message = '位置信息不可用';
        break;
      case error.TIMEOUT:
        message = '定位请求超时';
        break;
      default:
        message = error.message || '未知定位错误';
        break;
    }

    return new Error(message);
  }

  // 验证坐标
  validateCoordinates(lat, lng) {
    const errors = [];

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.push('纬度必须在 -90 到 90 之间');
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.push('经度必须在 -180 到 180 之间');
    }

    return {
      valid: errors.length === 0,
      errors,
      coordinates: errors.length === 0 ? { lat: latitude, lng: longitude } : null,
    };
  }

  // 格式化坐标显示
  formatCoordinates(lat, lng, precision = 6) {
    if (!lat || !lng) return '未知位置';

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) return '无效坐标';

    return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
  }

  // 计算两点间距离（简单的球面距离计算）
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  // 角度转弧度
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // 获取定位状态
  isLocating() {
    return this.locating;
  }

  // 停止定位（如果正在进行）
  stopLocating() {
    this.locating = false;
  }
}

// 创建单例实例
export const locationService = new LocationService();

export default LocationService;
