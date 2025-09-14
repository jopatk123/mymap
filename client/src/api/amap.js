import axios from 'axios';

// 注意：为避免在浏览器中暴露高德 Key，项目改为由后端代理调用高德接口。
// 后端代理路由：GET /api/amap/inputtips 和 GET /api/amap/place-text
// 后端会从服务器环境变量 AMAP_KEY 中读取 Key 并转发请求。

const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const amapApi = {
  async inputTips(keywords, opts = {}) {
    if (!keywords) return { tips: [] };
    const params = {
      keywords,
      type: opts.type || '',
      city: opts.city || '',
      citylimit: opts.citylimit ? 'true' : 'false',
    };
    const url = `${BACKEND_BASE}/api/amap/inputtips`;
    const { data } = await axios.get(url, { params });
    if (!data || !data.success) return { tips: [] };
    const payload = data.data || {};
    // 兼容后端原样转发的格式（高德返回在 payload.tips）
    return { tips: payload.tips || [] };
  },

  async searchPlaces(keywords, opts = {}) {
    if (!keywords) return { pois: [] };
    const params = {
      keywords,
      city: opts.city || '',
      citylimit: opts.citylimit ? 'true' : 'false',
      types: opts.types || '',
      offset: opts.offset || 20,
      page: opts.page || 1,
    };
    const url = `${BACKEND_BASE}/api/amap/place-text`;
    const { data } = await axios.get(url, { params });
    if (!data || !data.success) return { pois: [] };
    const payload = data.data || {};
    return { pois: payload.pois || [] };
  },
};

export default amapApi;
