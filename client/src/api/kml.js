import api from './index.js'

export const kmlApi = {
  // 上传KML文件
  uploadKmlFile(formData, onUploadProgress) {
    return api.post('/kml-files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    })
  },

  // 验证KML文件
  validateKmlFile(formData) {
    return api.post('/kml-files/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 获取KML文件列表
  getKmlFiles(params = {}) {
    return api.get('/kml-files', { params })
  },

  // 获取KML文件详情
  getKmlFileById(id) {
    return api.get(`/kml-files/${id}`)
  },

  // 获取KML文件的点位数据
  getKmlFilePoints(id) {
    return api.get(`/kml-files/${id}/points`)
  },

  // 根据地图边界获取KML点位
  getKmlPointsByBounds(bounds) {
    return api.get('/kml-files/points/bounds', { params: bounds })
  },

  // 更新KML文件
  updateKmlFile(id, data) {
    return api.put(`/kml-files/${id}`, data)
  },

  // 删除KML文件
  deleteKmlFile(id) {
    return api.delete(`/kml-files/${id}`)
  },

  // 批量删除KML文件
  batchDeleteKmlFiles(ids) {
    return api.delete('/kml-files', { data: { ids } })
  },

  // 批量更新KML文件可见性
  batchUpdateKmlFileVisibility(ids, isVisible) {
    return api.put('/kml-files/batch/visibility', { ids, isVisible })
  },

  // 批量移动KML文件到文件夹
  batchMoveKmlFilesToFolder(ids, folderId) {
    return api.put('/kml-files/batch/move', { ids, folderId })
  },

  // 更新KML文件可见性
  updateKmlFileVisibility(id, isVisible) {
    return api.put(`/kml-files/${id}/visibility`, { isVisible })
  },

  // 移动KML文件到文件夹
  moveKmlFileToFolder(id, folderId) {
    return api.put(`/kml-files/${id}/move`, { folderId })
  },

  // 获取KML文件统计信息
  getKmlFileStats() {
    return api.get('/kml-files/stats')
  }
}