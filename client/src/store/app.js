import { defineStore } from 'pinia'

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
      mapType: 'normal' // normal, satellite
    },
    // 应用状态
    isOnline: navigator.onLine,
    isMobile: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight
  }),
  
  getters: {
    // 是否为移动端
    isMobileDevice: (state) => {
      return state.isMobile || state.screenWidth < 768
    },
    
    // 是否为暗色主题
    isDarkTheme: (state) => {
      return state.theme === 'dark'
    },
    
    // 获取完整的地图配置
    mapConfig: (state) => {
      return {
        ...state.mapSettings,
        isMobile: state.isMobile
      }
    }
  },
  
  actions: {
    // 设置主题
    setTheme(theme) {
      this.theme = theme
      this.saveToLocalStorage()
    },
    
    // 切换主题
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      this.saveToLocalStorage()
    },
    
    // 设置侧边栏状态
    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed
      this.saveToLocalStorage()
    },
    
    // 切换侧边栏
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      this.saveToLocalStorage()
    },
    
    // 设置全景图列表显示状态
    setPanoramaListVisible(visible) {
      this.panoramaListVisible = visible
      this.saveToLocalStorage()
    },
    
    // 切换全景图列表显示状态
    togglePanoramaList() {
      this.panoramaListVisible = !this.panoramaListVisible
      this.saveToLocalStorage()
    },
    
    // 更新地图设置
    updateMapSettings(settings) {
      this.mapSettings = { ...this.mapSettings, ...settings }
      this.saveToLocalStorage()
    },
    
    // 设置在线状态
    setOnlineStatus(isOnline) {
      this.isOnline = isOnline
    },
    
    // 设置设备类型
    setDeviceType(isMobile) {
      this.isMobile = isMobile
    },
    
    // 更新屏幕尺寸
    updateScreenSize(width, height) {
      this.screenWidth = width
      this.screenHeight = height
      this.isMobile = width < 768
    },
    
    // 初始化应用
    initApp() {
      // 从本地存储加载设置
      this.loadFromLocalStorage()
      
      // 监听在线状态
      this.setupOnlineStatusListener()
      
      // 监听屏幕尺寸变化
      this.setupResizeListener()
      
      // 检测设备类型
      this.detectDeviceType()
    },
    
    // 设置在线状态监听器
    setupOnlineStatusListener() {
      window.addEventListener('online', () => {
        this.setOnlineStatus(true)
      })
      
      window.addEventListener('offline', () => {
        this.setOnlineStatus(false)
      })
    },
    
    // 设置窗口大小监听器
    setupResizeListener() {
      const handleResize = () => {
        this.updateScreenSize(window.innerWidth, window.innerHeight)
      }
      
      window.addEventListener('resize', handleResize)
      
      // 初始化时调用一次
      handleResize()
    },
    
    // 检测设备类型
    detectDeviceType() {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent)
      this.setDeviceType(isMobile)
    },
    
    // 保存到本地存储
    saveToLocalStorage() {
      const settings = {
        theme: this.theme,
        sidebarCollapsed: this.sidebarCollapsed,
        panoramaListVisible: this.panoramaListVisible,
        mapSettings: this.mapSettings
      }
      
      try {
        localStorage.setItem('app-settings', JSON.stringify(settings))
      } catch (error) {
        console.warn('无法保存设置到本地存储:', error)
      }
    },
    
    // 从本地存储加载
    loadFromLocalStorage() {
      try {
        const settings = localStorage.getItem('app-settings')
        if (settings) {
          const parsed = JSON.parse(settings)
          
          this.theme = parsed.theme || this.theme
          this.sidebarCollapsed = parsed.sidebarCollapsed ?? this.sidebarCollapsed
          this.panoramaListVisible = parsed.panoramaListVisible ?? this.panoramaListVisible
          this.mapSettings = { ...this.mapSettings, ...parsed.mapSettings }
        }
      } catch (error) {
        console.warn('无法从本地存储加载设置:', error)
      }
    }
  }
})