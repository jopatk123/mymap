import { defineStore } from 'pinia';
import { initialViewApi } from '../api/initial-view.js';

export const useAppStore = defineStore('app', {
  state: () => ({
    // 应用标题
    title: '地图全景系统',
    // 当前主题
    theme: 'light',
    // 侧边栏状态
    sidebarCollapsed: false,
    // 全景图列表显示状态
    panoramaListVisible: false, // 默认隐藏
    // 地图设置
    mapSettings: {
      mapType: 'satellite', // normal, satellite
      defaultCenter: [39.9042, 116.4074], // 默认北京 [lat, lng] 格式
      defaultZoom: 12,
    },
    // 初始显示设置
    initialViewSettings: {
      enabled: false,
      center: [116.4074, 39.9042], // WGS84 坐标 [lng, lat] 格式
      zoom: 12,
      loaded: false,
    },
    // 应用状态
    isOnline: navigator.onLine,
    isMobile: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  }),

  getters: {
    // 是否为移动端
    isMobileDevice: (state) => {
      return state.isMobile || state.screenWidth < 768;
    },

    // 是否为暗色主题
    isDarkTheme: (state) => {
      return state.theme === 'dark';
    },

    // 获取完整的地图配置
    mapConfig: (state) => {
      // 如果初始显示设置已启用，使用自定义设置，否则使用默认设置
      const defaultCenter = state.mapSettings.defaultCenter;
      const defaultZoom = state.mapSettings.defaultZoom;

      let center = defaultCenter;
      let zoom = defaultZoom;

      if (state.initialViewSettings.enabled && state.initialViewSettings.loaded) {
        // 转换坐标格式：从 WGS84 [lng, lat] 转为 Leaflet [lat, lng]
        center = [state.initialViewSettings.center[1], state.initialViewSettings.center[0]];
        zoom = state.initialViewSettings.zoom;
      }

      return {
        ...state.mapSettings,
        defaultCenter: center,
        defaultZoom: zoom,
        isMobile: state.isMobile,
      };
    },
  },

  actions: {
    // 设置主题
    setTheme(theme) {
      this.theme = theme;
      this.saveToLocalStorage();
    },

    // 切换主题
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      this.saveToLocalStorage();
    },

    // 设置侧边栏状态
    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed;
      this.saveToLocalStorage();
    },

    // 切换侧边栏
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      this.saveToLocalStorage();
    },

    // 设置全景图列表显示状态
    setPanoramaListVisible(visible) {
      this.panoramaListVisible = visible;
      this.saveToLocalStorage();
    },

    // 切换全景图列表显示状态
    togglePanoramaList() {
      this.panoramaListVisible = !this.panoramaListVisible;
      this.saveToLocalStorage();
    },

    // 更新地图设置
    updateMapSettings(settings) {
      this.mapSettings = { ...this.mapSettings, ...settings };
      this.saveToLocalStorage();
    },

    // 加载初始显示设置
    async loadInitialViewSettings() {
      try {
        // initialViewApi 可能返回 {success,data,...} 或直接返回 data（axios 拦截器已处理）
        const res = await initialViewApi.getSettings();
        const settings = res && res.data ? res.data : res;

        if (settings) {
          this.initialViewSettings = {
            ...settings,
            loaded: true,
          };
          // keep debug output available but suppress lint no-console
          void console.log('初始显示设置加载成功:', this.initialViewSettings);
        }
      } catch (error) {
        console.warn('加载初始显示设置失败，使用默认设置:', error);
        this.initialViewSettings.loaded = true; // 标记为已加载，避免重复请求
      }
    },

    // 更新初始显示设置
    async updateInitialViewSettings(settings) {
      try {
        const res = await initialViewApi.updateSettings(settings);
        const returned = res && res.data ? res.data : res;

        if (returned) {
          this.initialViewSettings = {
            ...returned,
            loaded: true,
          };
          // 触发全局事件，通知地图或其他组件立即应用新设置
          try {
            window.dispatchEvent(
              new CustomEvent('initial-view-updated', { detail: this.initialViewSettings })
            );
          } catch (e) {}
          return returned;
        }
        throw new Error('更新失败');
      } catch (error) {
        console.error('更新初始显示设置失败:', error);
        throw error;
      }
    },

    // 设置在线状态
    setOnlineStatus(isOnline) {
      this.isOnline = isOnline;
    },

    // 设置设备类型
    setDeviceType(isMobile) {
      this.isMobile = isMobile;
    },

    // 更新屏幕尺寸
    updateScreenSize(width, height) {
      this.screenWidth = width;
      this.screenHeight = height;
      this.isMobile = width < 768;
    },

    // 初始化应用
    async initApp() {
      // 从本地存储加载设置
      this.loadFromLocalStorage();

      // 加载初始显示设置
      await this.loadInitialViewSettings();

      // 监听在线状态
      this.setupOnlineStatusListener();

      // 监听屏幕尺寸变化
      this.setupResizeListener();

      // 检测设备类型
      this.detectDeviceType();
    },

    // 设置在线状态监听器
    setupOnlineStatusListener() {
      window.addEventListener('online', () => {
        this.setOnlineStatus(true);
      });

      window.addEventListener('offline', () => {
        this.setOnlineStatus(false);
      });
    },

    // 设置窗口大小监听器
    setupResizeListener() {
      const handleResize = () => {
        this.updateScreenSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize);

      // 初始化时调用一次
      handleResize();
    },

    // 检测设备类型
    detectDeviceType() {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
      this.setDeviceType(isMobile);
    },

    // 保存到本地存储
    saveToLocalStorage() {
      const settings = {
        theme: this.theme,
        sidebarCollapsed: this.sidebarCollapsed,
        panoramaListVisible: this.panoramaListVisible,
        mapSettings: this.mapSettings,
      };

      try {
        localStorage.setItem('app-settings', JSON.stringify(settings));
      } catch (error) {
        console.warn('无法保存设置到本地存储:', error);
      }
    },

    // 从本地存储加载
    loadFromLocalStorage() {
      try {
        const settings = localStorage.getItem('app-settings');
        if (settings) {
          const parsed = JSON.parse(settings);

          this.theme = parsed.theme || this.theme;
          this.sidebarCollapsed = parsed.sidebarCollapsed ?? this.sidebarCollapsed;
          this.panoramaListVisible = parsed.panoramaListVisible ?? this.panoramaListVisible;
          this.mapSettings = { ...this.mapSettings, ...parsed.mapSettings };
        }
      } catch (error) {
        console.warn('无法从本地存储加载设置:', error);
      }
    },
  },
});
