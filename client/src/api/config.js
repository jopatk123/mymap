import api from './index.js'

// 统一配置管理API
export const configApi = {
  // 获取完整配置
  getConfig() {
    return api.get('/config')
  },

  // 更新完整配置
  updateConfig(config) {
    return api.put('/config', config)
  },

  // 获取点位样式配置
  getPointStyles() {
    return api.get('/config/point-styles')
  },

  // 更新点位样式配置
  updatePointStyles(pointStyles) {
    return api.put('/config/point-styles', pointStyles)
  },

  // 获取KML样式配置
  getKmlStyles() {
    return api.get('/config/kml-styles')
  },

  // 更新KML样式配置
  updateKmlStyles(kmlStyles) {
    return api.put('/config/kml-styles', kmlStyles)
  },

  // 获取地图设置
  getMapSettings() {
    return api.get('/config/map-settings')
  },

  // 更新地图设置
  updateMapSettings(mapSettings) {
    return api.put('/config/map-settings', mapSettings)
  },

  // 获取上传设置
  getUploadSettings() {
    return api.get('/config/upload-settings')
  },

  // 更新上传设置
  updateUploadSettings(uploadSettings) {
    return api.put('/config/upload-settings', uploadSettings)
  },

  // 重置配置为默认值
  resetConfig() {
    return api.delete('/config')
  }
}