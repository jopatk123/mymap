import api from './index.js'

/**
 * 获取全景图列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
export function getPanoramas(params = {}) {
  return api.get('/panoramas', { params })
}

/**
 * 根据ID获取全景图详情
 * @param {number} id 全景图ID
 * @returns {Promise}
 */
export function getPanoramaById(id) {
  return api.get(`/panoramas/${id}`)
}

/**
 * 根据地图边界获取全景图
 * @param {Object} bounds 地图边界 {north, south, east, west}
 * @returns {Promise}
 */
export function getPanoramasByBounds(bounds) {
  return api.get('/panoramas/bounds', { params: bounds })
}

/**
 * 创建全景图
 * @param {Object} panoramaData 全景图数据
 * @returns {Promise}
 */
export function createPanorama(panoramaData) {
  return api.post('/panoramas', panoramaData)
}

/**
 * 更新全景图
 * @param {number} id 全景图ID
 * @param {Object} panoramaData 更新的数据
 * @returns {Promise}
 */
export function updatePanorama(id, panoramaData) {
  return api.put(`/panoramas/${id}`, panoramaData)
}

/**
 * 删除全景图
 * @param {number} id 全景图ID
 * @returns {Promise}
 */
export function deletePanorama(id) {
  return api.delete(`/panoramas/${id}`)
}

/**
 * 上传全景图文件
 * @param {FormData} formData 文件数据
 * @param {Function} onProgress 上传进度回调
 * @returns {Promise}
 */
export function uploadPanoramaImage(formData, onProgress) {
  return api.post('/panoramas/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      }
    }
  })
}

/**
 * 批量上传全景图
 * @param {Array} files 文件数组
 * @param {Function} onProgress 进度回调
 * @returns {Promise}
 */
export function batchUploadPanoramas(files, onProgress) {
  const formData = new FormData()
  files.forEach((file, index) => {
    formData.append(`files`, file)
  })
  
  return api.post('/panoramas/batch-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      }
    }
  })
}

/**
 * 搜索全景图
 * @param {Object} searchParams 搜索参数
 * @returns {Promise}
 */
export function searchPanoramas(searchParams) {
  return api.get('/panoramas/search', { params: searchParams })
}

/**
 * 获取附近的全景图
 * @param {number} lat 纬度
 * @param {number} lng 经度
 * @param {number} radius 半径（米）
 * @returns {Promise}
 */
export function getNearbyPanoramas(lat, lng, radius = 1000) {
  return api.get('/panoramas/nearby', {
    params: { lat, lng, radius }
  })
}