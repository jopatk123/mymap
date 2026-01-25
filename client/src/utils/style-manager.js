/**
 * 样式管理器 - 管理点位样式的全局状态和更新
 */
class StyleManager {
  constructor() {
    this.initialized = false;
    this.styles = {
      video: {
        point_color: '#ff4757',
        point_size: 10,
        point_opacity: 1.0,
        point_icon_type: 'marker',
        point_label_size: 14,
        point_label_color: '#000000',
        cluster_enabled: false,
        cluster_color: '#ff4757',
      },
      panorama: {
        point_color: '#2ed573',
        point_size: 10,
        point_opacity: 1.0,
        point_icon_type: 'marker',
        point_label_size: 12,
        point_label_color: '#000000',
        cluster_enabled: false,
        cluster_color: '#2ed573',
      },
      imageSet: {
        point_color: '#9b59b6',
        point_size: 10,
        point_opacity: 1.0,
        point_icon_type: 'marker',
        point_label_size: 14,
        point_label_color: '#000000',
        cluster_enabled: false,
        cluster_color: '#9b59b6',
      },
    };
    this.updateCallbacks = new Set();
  }

  /**
   * 初始化样式管理器
   */
  initialize() {
    if (this.initialized) return;

    // 从全局变量获取样式配置
    if (window.videoPointStyles) {
      this.styles.video = { ...window.videoPointStyles };
    }
    if (window.panoramaPointStyles) {
      this.styles.panorama = { ...window.panoramaPointStyles };
    }
    if (window.imageSetPointStyles) {
      this.styles.imageSet = { ...window.imageSetPointStyles };
    }

    this.initialized = true;
  }

  /**
   * 获取指定类型的样式配置
   * @param {string} type 'video' | 'panorama' | 'image-set'
   * @returns {Object} 样式配置
   */
  getStyles(type) {
    this.initialize();
    if (type === 'image-set') {
      return this.styles.imageSet || this.styles.panorama;
    }
    return this.styles[type] || this.styles.panorama;
  }

  /**
   * 更新样式配置
   * @param {string} type 'video' | 'panorama' | 'image-set'
   * @param {Object} newStyles 新的样式配置
   */
  updateStyles(type, newStyles) {
    this.initialize();
    
    if (type === 'image-set') {
      this.styles.imageSet = { ...newStyles };
      window.imageSetPointStyles = { ...newStyles };
    } else {
      this.styles[type] = { ...newStyles };
      // 同步到全局变量
      if (type === 'video') {
        window.videoPointStyles = { ...newStyles };
      } else if (type === 'panorama') {
        window.panoramaPointStyles = { ...newStyles };
      }
    }

    // 触发更新回调
    this.notifyUpdate(type, newStyles);
  }

  /**
   * 批量更新所有样式
   * @param {Object} allStyles 包含所有类型样式的对象
   */
  updateAllStyles(allStyles) {
    this.initialize();

    if (allStyles.video) {
      this.styles.video = { ...allStyles.video };
      window.videoPointStyles = { ...allStyles.video };
    }

    if (allStyles.panorama) {
      this.styles.panorama = { ...allStyles.panorama };
      window.panoramaPointStyles = { ...allStyles.panorama };
    }

    if (allStyles.imageSet) {
      this.styles.imageSet = { ...allStyles.imageSet };
      window.imageSetPointStyles = { ...allStyles.imageSet };
    }

    // 触发更新回调
    this.notifyUpdate('all', allStyles);
  }

  /**
   * 注册样式更新回调
   * @param {Function} callback 回调函数
   */
  onStyleUpdate(callback) {
    this.updateCallbacks.add(callback);

    // 返回取消注册的函数
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * 通知所有监听器样式已更新
   * @param {string} type 更新的样式类型
   * @param {Object} styles 新的样式配置
   */
  notifyUpdate(type, styles) {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(type, styles);
      } catch (error) {
        void console.warn('样式更新回调执行失败:', error);
      }
    });
  }

  /**
   * 强制刷新所有样式（从全局变量重新加载）
   */
  refresh() {
    if (window.videoPointStyles) {
      this.styles.video = { ...window.videoPointStyles };
    }
    if (window.panoramaPointStyles) {
      this.styles.panorama = { ...window.panoramaPointStyles };
    }
    if (window.imageSetPointStyles) {
      this.styles.imageSet = { ...window.imageSetPointStyles };
    }

    this.notifyUpdate('refresh', this.styles);
  }

  /**
   * 同步全局样式变量
   * @param {Object} videoStyles 视频点位样式
   * @param {Object} panoramaStyles 全景图点位样式
   * @param {Object} imageSetStyles 图片集点位样式
   */
  syncGlobalStyles(videoStyles, panoramaStyles, imageSetStyles) {
    if (videoStyles) {
      this.styles.video = { ...videoStyles };
      window.videoPointStyles = { ...videoStyles };
    }
    if (panoramaStyles) {
      this.styles.panorama = { ...panoramaStyles };
      window.panoramaPointStyles = { ...panoramaStyles };
    }
    if (imageSetStyles) {
      this.styles.imageSet = { ...imageSetStyles };
      window.imageSetPointStyles = { ...imageSetStyles };
    }
  }
}

// 创建全局实例
const styleManager = new StyleManager();

export default styleManager;
