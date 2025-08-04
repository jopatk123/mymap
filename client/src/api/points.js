import api from './index.js'

export const pointsApi = {
  // 获取所有点位（全景图 + 视频点位）
  getAllPoints(params = {}) {
    return api.get('/points', { params })
  },

  // 根据地图边界获取所有点位
  getPointsByBounds(bounds) {
    return api.get('/points/bounds', { params: bounds })
  },

  // 获取点位统计信息
  getPointsStats() {
    return api.get('/points/stats')
  }
}