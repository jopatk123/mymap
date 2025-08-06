import api from './index.js'

// 视频点位样式配置API
export const videoPointStyleApi = {
  // 获取视频点位样式配置
  getStyles() {
    return api.get('/point-styles/video')
  },

  // 更新视频点位样式配置
  updateStyles(styleConfig) {
    return api.put('/point-styles/video', styleConfig)
  },

  // 重置视频点位样式为默认
  resetStyles() {
    return api.delete('/point-styles/video')
  }
}

// 全景图点位样式配置API
export const panoramaPointStyleApi = {
  // 获取全景图点位样式配置
  getStyles() {
    return api.get('/point-styles/panorama')
  },

  // 更新全景图点位样式配置
  updateStyles(styleConfig) {
    return api.put('/point-styles/panorama', styleConfig)
  },

  // 重置全景图点位样式为默认
  resetStyles() {
    return api.delete('/point-styles/panorama')
  }
}