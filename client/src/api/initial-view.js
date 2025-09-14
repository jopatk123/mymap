import api from './index.js'

export const initialViewApi = {
  // 获取初始显示设置
  getSettings() {
    return api.get('/initial-view')
  },

  // 更新初始显示设置
  updateSettings(settings) {
    return api.put('/initial-view', settings)
  },

  // 重置初始显示设置
  resetSettings() {
    return api.post('/initial-view/reset')
  }
}