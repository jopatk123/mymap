import api from './index.js'

export const videoApi = {
  uploadVideo(formData, onUploadProgress) {
    return api.post('/video-points/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 300000
    })
  },
  getVideoPoints(params = {}) { return api.get('/video-points', { params }) },
  getVideoPoint(id) { return api.get(`/video-points/${id}`) },
  updateVideoPoint(id, data) { return api.put(`/video-points/${id}`, data) },
  deleteVideoPoint(id) { return api.delete(`/video-points/${id}`) },
  batchDeleteVideoPoints(ids) { return api.delete('/video-points', { data: { ids } }) },
  batchUpdateVideoPointsVisibility(ids, isVisible) { return api.patch('/video-points/batch/visibility', { ids, isVisible }) },
  batchMoveVideoPointsToFolder(ids, folderId) { return api.patch('/video-points/batch/move', { ids, folderId }) }
}


