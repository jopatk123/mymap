import api from './index.js'

export const videoApi = {
  // 上传视频文件
  uploadVideo(formData, onUploadProgress) {
    return api.post('/video-points/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress,
      timeout: 300000 // 5分钟超时，适合大文件上传
    })
  },

  // 获取视频点位列表
  getVideoPoints(params = {}) {
    return api.get('/video-points', { params })
  },

  // 获取单个视频点位
  getVideoPoint(id) {
    return api.get(`/video-points/${id}`)
  },

  // 更新视频点位
  updateVideoPoint(id, data) {
    return api.put(`/video-points/${id}`, data)
  },

  // 删除视频点位
  deleteVideoPoint(id) {
    return api.delete(`/video-points/${id}`)
  },

  // 批量删除视频点位
  batchDeleteVideoPoints(ids) {
    return api.delete('/video-points', { data: { ids } })
  },

  // 批量更新视频点位可见性
  batchUpdateVideoPointsVisibility(ids, isVisible) {
    return api.patch('/video-points/batch/visibility', { ids, isVisible })
  },

  // 批量移动视频点位到文件夹
  batchMoveVideoPointsToFolder(ids, folderId) {
    return api.patch('/video-points/batch/move', { ids, folderId })
  }
}