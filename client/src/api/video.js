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
  }
}