import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class KMLSearchAPI {
  /**
   * 搜索KML点位
   * @param {string} keyword - 搜索关键词
   * @param {Array<string>} files - 可选：指定搜索的KML文件列表
   * @returns {Promise<Object>} 搜索结果
   */
  async searchKMLPoints(keyword, files = []) {
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 1) {
      return { success: true, data: [] };
    }

    try {
      const params = { keyword: keyword.trim() };
      // 支持分页/限制，默认返回前100项
      params.limit = 100;
      params.offset = 0;
      if (files && files.length > 0) {
        params.files = files;
      }

      const response = await axios.get(`${BACKEND_BASE}/api/kml-search/search`, {
        params,
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error('搜索KML点位失败:', error);
      throw new Error(error.response?.data?.message || '搜索KML点位失败');
    }
  }

  /**
   * 获取所有KML点位
   * @param {Array<string>} files - 可选：指定的KML文件列表
   * @returns {Promise<Object>} 所有点位数据
   */
  async getAllKMLPoints(files = []) {
    try {
      const params = {};
      if (files && files.length > 0) {
        params.files = files;
      }

      const response = await axios.get(`${BACKEND_BASE}/api/kml-search/points`, {
        params,
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error('获取所有KML点位失败:', error);
      throw new Error(error.response?.data?.message || '获取所有KML点位失败');
    }
  }

  /**
   * 根据ID获取KML点位详情
   * @param {string} id - 点位ID
   * @returns {Promise<Object>} 点位详情
   */
  async getKMLPointById(id) {
    if (!id) {
      throw new Error('点位ID不能为空');
    }

    try {
      const response = await axios.get(
        `${BACKEND_BASE}/api/kml-search/points/${encodeURIComponent(id)}`,
        {
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('获取KML点位详情失败:', error);
      throw new Error(error.response?.data?.message || '获取KML点位详情失败');
    }
  }
}

// 创建单例实例
export const kmlSearchApi = new KMLSearchAPI();
export default kmlSearchApi;
