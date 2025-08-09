import request from './index.js'

export const folderApi = {
  // 获取文件夹树
  getFolders() {
    return request.get('/folders')
  },

  // 获取文件夹列表（平铺）
  getFoldersFlat() {
    return request.get('/folders/flat')
  },

  // 创建文件夹
  createFolder(data) {
    return request.post('/folders', data)
  },

  // 更新文件夹
  updateFolder(id, data) {
    return request.put(`/folders/${id}`, data)
  },

  // 删除文件夹
  deleteFolder(id) {
    return request.delete(`/folders/${id}`)
  },

  // 移动文件夹
  moveFolder(id, data) {
    return request.patch(`/folders/${id}/move`, data)
  },

  // 更新文件夹可见性
  updateFolderVisibility(id, data) {
    return request.patch(`/folders/${id}/visibility`, data)
  },

  // 获取文件夹中的全景图
  getFolderPanoramas(id, params = {}) {
    return request.get(`/folders/${id}/panoramas`, { params })
  },

  // 移动全景图到文件夹
  movePanoramasToFolder(folderId, data) {
    return request.post(`/folders/${folderId}/panoramas`, data)
  },

  // 获取文件夹内容（统一接口）
  getFolderContents(folderId, params = {}) {
    return request.get(`/folders/${folderId}/contents`, { params })
  },

  // 获取根目录内容
  getRootContents(params = {}) {
    return request.get('/folders/0/contents', { params })
  }
}