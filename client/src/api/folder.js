import request from './index.js';

export const folderApi = {
  getFolders() {
    return request.get('/folders');
  },
  getFoldersFlat() {
    return request.get('/folders/flat');
  },
  createFolder(data) {
    return request.post('/folders', data);
  },
  updateFolder(id, data) {
    return request.put(`/folders/${id}`, data);
  },
  deleteFolder(id) {
    return request.delete(`/folders/${id}`);
  },
  moveFolder(id, data) {
    return request.patch(`/folders/${id}/move`, data);
  },
  updateFolderVisibility(id, data) {
    return request.patch(`/folders/${id}/visibility`, data);
  },
  getFolderPanoramas(id, params = {}) {
    return request.get(`/folders/${id}/panoramas`, { params });
  },
  movePanoramasToFolder(folderId, data) {
    return request.post(`/folders/${folderId}/panoramas`, data);
  },
  getFolderContents(folderId, params = {}) {
    return request.get(`/folders/${folderId}/contents`, { params });
  },
  getRootContents(params = {}) {
    return request.get('/folders/0/contents', { params });
  },
};
