import api from './index.js';

export const imageSetApi = {
  /**
   * 上传并创建图片集
   * @param {FormData} formData - 包含 files, title, lat, lng 等字段
   * @param {Function} onUploadProgress - 上传进度回调
   */
  uploadImageSet(formData, onUploadProgress) {
    return api.post('/image-sets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 300000,
    });
  },

  /**
   * 获取图片集列表
   */
  getImageSets(params = {}) {
    return api.get('/image-sets', { params });
  },

  /**
   * 根据ID获取图片集详情
   */
  getImageSet(id) {
    return api.get(`/image-sets/${id}`);
  },

  /**
   * 根据地图边界获取图片集
   */
  getImageSetsByBounds(bounds) {
    return api.get('/image-sets/bounds', { params: bounds });
  },

  /**
   * 获取图片集统计信息
   */
  getImageSetStats() {
    return api.get('/image-sets/stats');
  },

  /**
   * 更新图片集
   */
  updateImageSet(id, data) {
    return api.put(`/image-sets/${id}`, data);
  },

  /**
   * 删除图片集
   */
  deleteImageSet(id) {
    return api.delete(`/image-sets/${id}`);
  },

  /**
   * 批量删除图片集
   */
  batchDeleteImageSets(ids) {
    return api.delete('/image-sets', { data: { ids } });
  },

  /**
   * 批量更新图片集可见性
   */
  batchUpdateVisibility(ids, isVisible) {
    return api.patch('/image-sets/batch/visibility', { ids, isVisible });
  },

  /**
   * 批量移动图片集到文件夹
   */
  batchMoveToFolder(ids, folderId) {
    return api.patch('/image-sets/batch/move', { ids, folderId });
  },

  /**
   * 更新图片集可见性
   */
  updateVisibility(id, isVisible) {
    return api.patch(`/image-sets/${id}/visibility`, { isVisible });
  },

  /**
   * 移动图片集到文件夹
   */
  moveToFolder(id, folderId) {
    return api.patch(`/image-sets/${id}/move`, { folderId });
  },

  /**
   * 添加图片到图片集
   * @param {number} id - 图片集ID
   * @param {FormData} formData - 包含 files 字段
   * @param {Function} onUploadProgress - 上传进度回调
   */
  addImages(id, formData, onUploadProgress) {
    return api.post(`/image-sets/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 300000,
    });
  },

  /**
   * 从图片集删除图片
   */
  removeImage(imageSetId, imageId) {
    return api.delete(`/image-sets/${imageSetId}/images/${imageId}`);
  },

  /**
   * 更新图片排序
   * @param {number} id - 图片集ID
   * @param {Array} imageOrders - 排序数组 [{id, sortOrder}, ...]
   */
  updateImageOrder(id, imageOrders) {
    return api.patch(`/image-sets/${id}/images/order`, { imageOrders });
  },
};
