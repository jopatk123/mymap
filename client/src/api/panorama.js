import api from './index.js'

export function getPanoramas(params = {}) {
  return api.get('/panoramas', { params })
}
export function getPanoramaById(id) {
  return api.get(`/panoramas/${id}`)
}
export function getPanoramasByBounds(bounds) {
  return api.get('/panoramas/bounds', { params: bounds })
}
export function createPanorama(panoramaData) {
  return api.post('/panoramas', panoramaData)
}
export function updatePanorama(id, panoramaData) {
  return api.put(`/panoramas/${id}`, panoramaData)
}
export function deletePanorama(id) {
  return api.delete(`/panoramas/${id}`)
}
export function uploadPanoramaImage(formData, onProgress) {
  return api.post('/panoramas/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
    onUploadProgress: (e) => {
      if (onProgress) {
        const percent = Math.round((e.loaded * 100) / e.total)
        onProgress(percent)
      }
    }
  })
}
export function batchUploadPanoramas(files, onProgress) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return api.post('/panoramas/batch-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) {
        const percent = Math.round((e.loaded * 100) / e.total)
        onProgress(percent)
      }
    }
  })
}
export function searchPanoramas(searchParams) {
  return api.get('/panoramas/search', { params: searchParams })
}
export function getNearbyPanoramas(lat, lng, radius = 1000) {
  return api.get('/panoramas/nearby', { params: { lat, lng, radius } })
}
export function batchDeletePanoramas(ids) {
  return api.delete('/panoramas', { data: { ids } })
}
export function movePanoramaToFolder(id, folderId) {
  return api.patch(`/panoramas/${id}/move`, { folderId })
}
export function batchMovePanoramasToFolder(ids, folderId) {
  return api.patch('/panoramas/batch/move', { ids, folderId })
}
export function updatePanoramaVisibility(id, isVisible) {
  return api.patch(`/panoramas/${id}/visibility`, { isVisible })
}
export function batchUpdatePanoramaVisibility(ids, isVisible) {
  return api.patch('/panoramas/batch/visibility', { ids, isVisible })
}


