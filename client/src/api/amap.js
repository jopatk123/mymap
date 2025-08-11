import axios from 'axios'

// 从环境变量读取高德 Key（需在 .env 中配置 VITE_AMAP_KEY）
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY

if (!AMAP_KEY) {
  // 非致命，仅提示；开发环境可在控制台看到
  // eslint-disable-next-line no-console
  console.warn('未检测到 VITE_AMAP_KEY，地址搜索将不可用')
}

const AMAP_BASE = 'https://restapi.amap.com/v3'

export const amapApi = {
  // 输入提示（联想）
  async inputTips(keywords, opts = {}) {
    if (!AMAP_KEY || !keywords) return { tips: [] }
    const params = {
      key: AMAP_KEY,
      keywords,
      type: opts.type || '',
      city: opts.city || '',
      citylimit: opts.citylimit ? 'true' : 'false',
    }
    const { data } = await axios.get(`${AMAP_BASE}/assistant/inputtips`, { params })
    if (data.status !== '1') return { tips: [] }
    return { tips: data.tips || [] }
  },

  // 关键字 POI 搜索
  async searchPlaces(keywords, opts = {}) {
    if (!AMAP_KEY || !keywords) return { pois: [] }
    const params = {
      key: AMAP_KEY,
      keywords,
      city: opts.city || '',
      citylimit: opts.citylimit ? 'true' : 'false',
      types: opts.types || '',
      offset: opts.offset || 20,
      page: opts.page || 1,
    }
    const { data } = await axios.get(`${AMAP_BASE}/place/text`, { params })
    if (data.status !== '1') return { pois: [] }
    return { pois: data.pois || [] }
  }
}

export default amapApi


