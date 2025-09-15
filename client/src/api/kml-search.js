import axios from 'axios';
import api from './index';

// 优先使用项目统一的 axios 实例（baseURL=/api），避免在生产环境中把后端地址写死在 bundle 中。
// 仅在开发环境且明确设置了 VITE_API_BASE_URL 时，允许回退到该绝对地址（便于本地调试）。
const DEV_BACKEND_BASE = import.meta.env.VITE_API_BASE_URL || null;

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

      // 在生产或默认情况下使用相对 /api 路径（通过项目的 api 实例统一处理）
      if (DEV_BACKEND_BASE && import.meta.env.MODE !== 'production') {
        const response = await axios.get(`${DEV_BACKEND_BASE}/api/kml-search/search`, {
          params,
          timeout: 10000,
        });
        // Normalize shape: if backend returns raw array/object, wrap into { success, data }
        const d = response.data;
        if (d && d.success !== undefined) return d;
        return { success: true, data: d };
      }

      const resp = await api.get('/kml-search/search', { params });
      // The shared api instance may unwrap different response formats. Normalize here so callers
      // (like SearchTool.vue) can reliably check response.success and response.data.
      if (resp && resp.success !== undefined) {
        return resp;
      }
      return { success: true, data: resp };
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

      if (DEV_BACKEND_BASE && import.meta.env.MODE !== 'production') {
        const response = await axios.get(`${DEV_BACKEND_BASE}/api/kml-search/points`, {
          params,
          timeout: 10000,
        });
        const d = response.data;
        if (d && d.success !== undefined) return d;
        return { success: true, data: d };
      }

      const resp = await api.get('/kml-search/points', { params });
      if (resp && resp.success !== undefined) return resp;
      return { success: true, data: resp };
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
      if (DEV_BACKEND_BASE && import.meta.env.MODE !== 'production') {
        const response = await axios.get(
          `${DEV_BACKEND_BASE}/api/kml-search/points/${encodeURIComponent(id)}`,
          { timeout: 10000 }
        );
        const d = response.data;
        if (d && d.success !== undefined) return d;
        return { success: true, data: d };
      }

      const resp = await api.get(`/kml-search/points/${encodeURIComponent(id)}`);
      if (resp && resp.success !== undefined) return resp;
      return { success: true, data: resp };
    } catch (error) {
      console.error('获取KML点位详情失败:', error);
      throw new Error(error.response?.data?.message || '获取KML点位详情失败');
    }
  }
}

// 创建单例实例
export const kmlSearchApi = new KMLSearchAPI();
export default kmlSearchApi;
